-- =============================================================================
-- 0002 — Framefore Core Tables
-- =============================================================================
-- Purpose: Creates all project, scene, canvas, and asset metadata tables.
--
-- PRODUCT RULE (must never break):
--   Timeline = real video order.
--   Canvas   = visual thinking space only.
--   Export   = based on project.scenes array order, NOT canvas positions.
--
-- Cloud enforcement of this rule: scenes.order_index is the single source of
-- truth for video sequence. The export reconstruction query is:
--   SELECT * FROM scenes WHERE project_id = $1 ORDER BY order_index ASC;
-- Canvas tables (canvas_notes, canvas_sections, canvas_links, scene.layout)
-- are purely visual and carry NO sequencing meaning.
--
-- Safe to re-run: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS.
-- Run after 0001 (depends on auth.users existing).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. projects
-- ---------------------------------------------------------------------------
-- One row per Framefore project, owned by a user.
-- client_id stores the original local nanoid for idempotent migration (see
-- plan/08-local-to-cloud-migration-plan.md). The unique index on (user_id,
-- client_id) prevents duplicate uploads of the same local project.

CREATE TABLE IF NOT EXISTS public.projects (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Original local Project.id — retained for migration idempotency only.
  client_id           text,
  title               text        NOT NULL DEFAULT 'Untitled Project',
  description         text        NOT NULL DEFAULT '',
  topic               text        NOT NULL DEFAULT '',
  platform            text        NOT NULL DEFAULT 'YouTube',
  aspect_ratio        text        NOT NULL DEFAULT '16:9',
  target_length_sec   int         NOT NULL DEFAULT 0,
  visual_style        text        NOT NULL DEFAULT '',
  mood                text        NOT NULL DEFAULT '',
  default_image_model text        NOT NULL DEFAULT '',
  default_video_model text        NOT NULL DEFAULT '',
  -- GlobalSettings object: visualStyle, cameraStyle, mood, colorPalette,
  -- mainCharacter, mainLocation, negativePrompt, targetToolNotes, outputFormatNotes.
  -- Stored as JSONB to avoid schema churn as the global bag evolves.
  global              jsonb       NOT NULL DEFAULT '{}'::jsonb,
  -- Full narration script for the whole video.
  narration           text        NOT NULL DEFAULT '',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  -- ── Tenant-integrity anchor ───────────────────────────────────────────────
  -- id is already unique (PK), but this composite UNIQUE makes (id, user_id) a
  -- valid FK target. Child tables reference it so a row can never point at a
  -- project owned by a different user — enforced structurally, below RLS.
  CONSTRAINT projects_id_user_uniq UNIQUE (id, user_id),

  -- ── Payload guards (defense against huge / malformed payloads) ────────────
  CONSTRAINT projects_title_len   CHECK (char_length(title)               <= 160),
  CONSTRAINT projects_desc_len    CHECK (char_length(description)         <= 5000),
  CONSTRAINT projects_topic_len   CHECK (char_length(topic)               <= 500),
  CONSTRAINT projects_platform_len     CHECK (char_length(platform)       <= 80),
  CONSTRAINT projects_aspect_len       CHECK (char_length(aspect_ratio)   <= 20),
  CONSTRAINT projects_img_model_len    CHECK (char_length(default_image_model) <= 120),
  CONSTRAINT projects_vid_model_len    CHECK (char_length(default_video_model) <= 120),
  CONSTRAINT projects_target_len_range CHECK (target_length_sec >= 0 AND target_length_sec <= 86400),
  -- global must be a JSON object, not an array/scalar (prevents shape abuse).
  CONSTRAINT projects_global_is_object CHECK (jsonb_typeof(global) = 'object')
);

-- Idempotent migration guard: one cloud row per (user, local project).
CREATE UNIQUE INDEX IF NOT EXISTS projects_user_client_uidx
  ON public.projects(user_id, client_id)
  WHERE client_id IS NOT NULL;

-- Efficient "load all projects for user, newest first" query.
CREATE INDEX IF NOT EXISTS projects_user_updated_idx
  ON public.projects(user_id, updated_at DESC);

DROP TRIGGER IF EXISTS set_projects_updated_at ON public.projects;
CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. scenes  ⭐ GOLDEN-RULE TABLE
-- ---------------------------------------------------------------------------
-- Ordered scenes within a project.
--
-- ★ order_index is the cloud equivalent of the local Project.scenes array
--   position. It IS the video order. The export query must always use:
--     ORDER BY order_index ASC
--   Never derive video order from canvas layout, x/y, or any visual column.
--
-- Column groupings:
--   - Identity / ordering: id, project_id, user_id, client_id, order_index
--   - Scene content: title, subject_name, summary, duration_sec, status, role, tag, color
--   - Prompts: visual_prompt, negative_prompt, narration_part, transition_to_next,
--              continuity_notes, ending_beat
--   - JSONB craft bag: cameraAngle, cameraMovement, mood, lighting, visualStyle
--   - JSONB notes bag: characterNotes, locationNotes, motionNotes, sfxNotes,
--                      musicNotes, notes
--   - Models: image_model, video_model
--   - Canvas (visual ONLY, never export/order): layout {x,y}, collapsed
--   - Direction hints for RTL languages: prompt_dir, narration_dir

CREATE TABLE IF NOT EXISTS public.scenes (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  -- Denormalized for simple, join-free RLS policies.
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Original local Scene.id — used to resolve FK references during migration.
  client_id           text,

  -- ★ THE VIDEO ORDER. Export must ORDER BY this column, not by layout/canvas.
  order_index         int         NOT NULL,

  title               text        NOT NULL DEFAULT '',
  subject_name        text        NOT NULL DEFAULT '',
  summary             text        NOT NULL DEFAULT '',
  duration_sec        int         NOT NULL DEFAULT 10,
  status              text        NOT NULL DEFAULT 'Idea',
  role                text        NOT NULL DEFAULT 'none',
  tag                 text,                               -- nullable; legacy field
  color               text        NOT NULL DEFAULT 'none',

  visual_prompt       text        NOT NULL DEFAULT '',
  negative_prompt     text        NOT NULL DEFAULT '',
  narration_part      text        NOT NULL DEFAULT '',
  transition_to_next  text        NOT NULL DEFAULT '',
  continuity_notes    text        NOT NULL DEFAULT '',
  ending_beat         text        NOT NULL DEFAULT '',

  -- Camera/lighting/style overrides. Maps Scene fields:
  --   { cameraAngle, cameraMovement, mood, lighting, visualStyle }
  craft               jsonb       NOT NULL DEFAULT '{}'::jsonb,

  -- Production annotation fields. Maps Scene fields:
  --   { characterNotes, locationNotes, motionNotes, sfxNotes, musicNotes, notes }
  notes_bag           jsonb       NOT NULL DEFAULT '{}'::jsonb,

  image_model         text        NOT NULL DEFAULT '',
  video_model         text        NOT NULL DEFAULT '',

  -- Canvas position {x, y}. VISUAL ONLY — has zero effect on video sequence.
  -- NULL means the canvas auto-places the card (same as local behaviour).
  layout              jsonb,

  collapsed           boolean     NOT NULL DEFAULT false,
  prompt_dir          text        NOT NULL DEFAULT 'ltr',
  narration_dir       text        NOT NULL DEFAULT 'ltr',

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  -- ── Tenant-integrity anchors ──────────────────────────────────────────────
  -- (1) Composite UNIQUE so scene_links / scene_assets can reference a scene
  --     together with its project_id + user_id (cross-tenant links impossible).
  CONSTRAINT scenes_id_project_user_uniq UNIQUE (id, project_id, user_id),
  -- (2) Composite FK: the scene's (project_id, user_id) pair MUST match a real
  --     project owned by the same user. A user can never move a scene into
  --     another user's project, nor forge user_id, even via the service role.
  CONSTRAINT scenes_project_user_fk
    FOREIGN KEY (project_id, user_id)
    REFERENCES public.projects(id, user_id) ON DELETE CASCADE,

  -- ── Data-integrity guards ─────────────────────────────────────────────────
  -- order_index is the video order; it must be a sane non-negative position.
  CONSTRAINT scenes_order_nonneg     CHECK (order_index >= 0),
  CONSTRAINT scenes_duration_range   CHECK (duration_sec >= 1 AND duration_sec <= 600),
  CONSTRAINT scenes_title_len        CHECK (char_length(title)         <= 160),
  CONSTRAINT scenes_subject_len      CHECK (char_length(subject_name)  <= 160),
  CONSTRAINT scenes_visual_len       CHECK (char_length(visual_prompt) <= 20000),
  CONSTRAINT scenes_narration_len    CHECK (char_length(narration_part)<= 20000),
  CONSTRAINT scenes_prompt_dir_ck    CHECK (prompt_dir    IN ('ltr','rtl','auto')),
  CONSTRAINT scenes_narration_dir_ck CHECK (narration_dir IN ('ltr','rtl','auto')),
  -- JSONB shape guards: bags must be objects; layout is object-or-NULL.
  CONSTRAINT scenes_craft_is_object  CHECK (jsonb_typeof(craft)     = 'object'),
  CONSTRAINT scenes_notes_is_object  CHECK (jsonb_typeof(notes_bag) = 'object'),
  CONSTRAINT scenes_layout_is_object CHECK (layout IS NULL OR jsonb_typeof(layout) = 'object')
);

-- Primary access pattern: "all scenes for a project in video order".
CREATE INDEX IF NOT EXISTS scenes_project_order_idx
  ON public.scenes(project_id, order_index);

-- RLS-efficient "all scenes owned by this user" scan.
CREATE INDEX IF NOT EXISTS scenes_user_idx
  ON public.scenes(user_id);

-- Idempotent migration guard: one cloud row per (project, local scene).
CREATE UNIQUE INDEX IF NOT EXISTS scenes_project_client_uidx
  ON public.scenes(project_id, client_id)
  WHERE client_id IS NOT NULL;

DROP TRIGGER IF EXISTS set_scenes_updated_at ON public.scenes;
CREATE TRIGGER set_scenes_updated_at
  BEFORE UPDATE ON public.scenes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. scene_links  (visual scene→scene arrows — NOT video order)
-- ---------------------------------------------------------------------------
-- Maps Project.links: SceneLink[]. These are manual visual relationship arrows
-- drawn between scene cards on the canvas. They are workflow annotations ONLY
-- and must never be used to determine video sequence.

CREATE TABLE IF NOT EXISTS public.scene_links (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_scene_id uuid        NOT NULL REFERENCES public.scenes(id) ON DELETE CASCADE,
  to_scene_id   uuid        NOT NULL REFERENCES public.scenes(id) ON DELETE CASCADE,
  label         text,
  type          text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  -- ── Tenant-integrity FKs ──────────────────────────────────────────────────
  -- The link's project must belong to the user, and BOTH endpoint scenes must
  -- belong to that same project + user. This makes a scene_link that crosses
  -- tenants or projects structurally impossible — not merely RLS-blocked.
  CONSTRAINT scene_links_project_user_fk
    FOREIGN KEY (project_id, user_id)
    REFERENCES public.projects(id, user_id) ON DELETE CASCADE,
  CONSTRAINT scene_links_from_scene_fk
    FOREIGN KEY (from_scene_id, project_id, user_id)
    REFERENCES public.scenes(id, project_id, user_id) ON DELETE CASCADE,
  CONSTRAINT scene_links_to_scene_fk
    FOREIGN KEY (to_scene_id, project_id, user_id)
    REFERENCES public.scenes(id, project_id, user_id) ON DELETE CASCADE,
  CONSTRAINT scene_links_label_len CHECK (label IS NULL OR char_length(label) <= 200),
  CONSTRAINT scene_links_type_len  CHECK (type  IS NULL OR char_length(type)  <= 60)
);

CREATE INDEX IF NOT EXISTS scene_links_project_idx ON public.scene_links(project_id);
CREATE INDEX IF NOT EXISTS scene_links_user_idx    ON public.scene_links(user_id);

DROP TRIGGER IF EXISTS set_scene_links_updated_at ON public.scene_links;
CREATE TRIGGER set_scene_links_updated_at
  BEFORE UPDATE ON public.scene_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. canvas_notes  (VISUAL ONLY — sticky notes on the whiteboard)
-- ---------------------------------------------------------------------------
-- Maps Project.canvasNotes: CanvasNote[].
-- These are production notes placed on the canvas. They are NEVER exported as
-- scenes. x/y are canvas coordinates, not video order indicators.

CREATE TABLE IF NOT EXISTS public.canvas_notes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id   text,
  x           int         NOT NULL DEFAULT 0,
  y           int         NOT NULL DEFAULT 0,
  text        text        NOT NULL DEFAULT '',
  -- CanvasNoteKind: 'idea' | 'todo' | 'fix' | 'reference'
  kind        text        NOT NULL DEFAULT 'idea',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  -- Tenant-integrity: note's project must be owned by the same user.
  CONSTRAINT canvas_notes_project_user_fk
    FOREIGN KEY (project_id, user_id)
    REFERENCES public.projects(id, user_id) ON DELETE CASCADE,
  CONSTRAINT canvas_notes_text_len CHECK (char_length(text) <= 5000),
  CONSTRAINT canvas_notes_x_range  CHECK (x BETWEEN -1000000 AND 1000000),
  CONSTRAINT canvas_notes_y_range  CHECK (y BETWEEN -1000000 AND 1000000)
);

CREATE INDEX IF NOT EXISTS canvas_notes_project_idx ON public.canvas_notes(project_id);
CREATE INDEX IF NOT EXISTS canvas_notes_user_idx    ON public.canvas_notes(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS canvas_notes_project_client_uidx
  ON public.canvas_notes(project_id, client_id)
  WHERE client_id IS NOT NULL;

DROP TRIGGER IF EXISTS set_canvas_notes_updated_at ON public.canvas_notes;
CREATE TRIGGER set_canvas_notes_updated_at
  BEFORE UPDATE ON public.canvas_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. canvas_sections  (VISUAL ONLY — labelled frame regions on the canvas)
-- ---------------------------------------------------------------------------
-- Maps Project.canvasSections: CanvasSection[].
-- Rectangular labelled zones on the canvas (e.g., "Hook", "Setup"). Visual only.

CREATE TABLE IF NOT EXISTS public.canvas_sections (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id   text,
  title       text        NOT NULL DEFAULT '',
  x           int         NOT NULL DEFAULT 0,
  y           int         NOT NULL DEFAULT 0,
  width       int         NOT NULL DEFAULT 640,
  height      int         NOT NULL DEFAULT 360,
  -- CanvasSectionType: 'hook'|'setup'|'conflict'|'climax'|'outro'|'custom'
  kind        text        NOT NULL DEFAULT 'custom',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  -- Tenant-integrity: section's project must be owned by the same user.
  CONSTRAINT canvas_sections_project_user_fk
    FOREIGN KEY (project_id, user_id)
    REFERENCES public.projects(id, user_id) ON DELETE CASCADE,
  CONSTRAINT canvas_sections_title_len CHECK (char_length(title) <= 200),
  CONSTRAINT canvas_sections_w_range   CHECK (width  BETWEEN 0 AND 100000),
  CONSTRAINT canvas_sections_h_range   CHECK (height BETWEEN 0 AND 100000),
  CONSTRAINT canvas_sections_x_range   CHECK (x BETWEEN -1000000 AND 1000000),
  CONSTRAINT canvas_sections_y_range   CHECK (y BETWEEN -1000000 AND 1000000)
);

CREATE INDEX IF NOT EXISTS canvas_sections_project_idx ON public.canvas_sections(project_id);
CREATE INDEX IF NOT EXISTS canvas_sections_user_idx    ON public.canvas_sections(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS canvas_sections_project_client_uidx
  ON public.canvas_sections(project_id, client_id)
  WHERE client_id IS NOT NULL;

DROP TRIGGER IF EXISTS set_canvas_sections_updated_at ON public.canvas_sections;
CREATE TRIGGER set_canvas_sections_updated_at
  BEFORE UPDATE ON public.canvas_sections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. canvas_links  (VISUAL ONLY — typed edges across canvas nodes)
-- ---------------------------------------------------------------------------
-- Maps Project.canvasLinks: CanvasLink[].
-- Generic directed edges between any combination of scene/note/section nodes.
-- node_id columns are text (not FK) because the target can be a scene, note,
-- OR section — a polymorphic relationship that can't use a single typed FK.
-- Integrity is enforced in app code on save, as it is locally.
-- These links are PURELY visual workspace annotations and have NO effect on
-- video sequence or export output.

CREATE TABLE IF NOT EXISTS public.canvas_links (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_node_id    text        NOT NULL,
  to_node_id      text        NOT NULL,
  -- CanvasNodeType: 'scene' | 'note' | 'section'
  from_node_type  text        NOT NULL
    CHECK (from_node_type IN ('scene', 'note', 'section')),
  to_node_type    text        NOT NULL
    CHECK (to_node_type   IN ('scene', 'note', 'section')),
  label           text,
  -- CanvasLinkType: 'transition'|'continuity'|'reference'|'alternate'|
  --                 'todo'|'idea'|'fix'|'note'
  type            text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- Tenant-integrity: link's project must be owned by the same user. The node
  -- endpoints stay polymorphic text (scene/note/section), validated in app code
  -- on save — they carry NO sequencing meaning regardless of integrity.
  CONSTRAINT canvas_links_project_user_fk
    FOREIGN KEY (project_id, user_id)
    REFERENCES public.projects(id, user_id) ON DELETE CASCADE,
  CONSTRAINT canvas_links_from_len  CHECK (char_length(from_node_id) <= 128),
  CONSTRAINT canvas_links_to_len    CHECK (char_length(to_node_id)   <= 128),
  CONSTRAINT canvas_links_label_len CHECK (label IS NULL OR char_length(label) <= 200)
);

CREATE INDEX IF NOT EXISTS canvas_links_project_idx ON public.canvas_links(project_id);
CREATE INDEX IF NOT EXISTS canvas_links_user_idx    ON public.canvas_links(user_id);

DROP TRIGGER IF EXISTS set_canvas_links_updated_at ON public.canvas_links;
CREATE TRIGGER set_canvas_links_updated_at
  BEFORE UPDATE ON public.canvas_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. scene_assets  (reference image metadata — binary lives in Storage)
-- ---------------------------------------------------------------------------
-- Maps SceneImage[] but stores only metadata. The actual file lives in the
-- `reference-images` Storage bucket at storage_path. See 0004 for bucket setup.
--
-- storage_path convention: {user_id}/{project_id}/{scene_id}/{uuid}.{ext}
-- The first segment (user_id) drives Storage RLS policies.
-- client_image_id is the original local blob key from framefore-images IndexedDB,
-- used for idempotent migration (skip if already uploaded).

CREATE TABLE IF NOT EXISTS public.scene_assets (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id          uuid        NOT NULL REFERENCES public.scenes(id) ON DELETE CASCADE,
  project_id        uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Original local SceneImage.id (blob key). NULL for directly-uploaded cloud images.
  client_image_id   text,
  -- Full path within the reference-images bucket. Never expose publicly; use signed URLs.
  storage_path      text        NOT NULL,
  name              text        NOT NULL DEFAULT '',
  mime_type         text        NOT NULL DEFAULT '',
  size_bytes        bigint      NOT NULL DEFAULT 0,
  -- Order within the scene's image list (mirrors local images array index).
  position          int         NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  -- ── Tenant-integrity FKs ──────────────────────────────────────────────────
  -- The asset's scene AND project must both belong to the same user. An asset
  -- can never be attached to another user's scene/project, even via raw SQL.
  CONSTRAINT scene_assets_project_user_fk
    FOREIGN KEY (project_id, user_id)
    REFERENCES public.projects(id, user_id) ON DELETE CASCADE,
  CONSTRAINT scene_assets_scene_fk
    FOREIGN KEY (scene_id, project_id, user_id)
    REFERENCES public.scenes(id, project_id, user_id) ON DELETE CASCADE,

  -- ── Data-integrity guards (mirror the Storage bucket rules) ───────────────
  CONSTRAINT scene_assets_size_range CHECK (size_bytes >= 0 AND size_bytes <= 10485760),
  CONSTRAINT scene_assets_position_nonneg CHECK (position >= 0),
  CONSTRAINT scene_assets_path_len   CHECK (char_length(storage_path) BETWEEN 1 AND 1024),
  CONSTRAINT scene_assets_name_len   CHECK (char_length(name) <= 255),
  -- Empty mime is allowed only as an "unknown yet" placeholder; any non-empty
  -- value must be a non-SVG image type (SVG can carry script — excluded here
  -- and in the Storage bucket's allowed_mime_types).
  CONSTRAINT scene_assets_mime_image CHECK (
    mime_type = ''
    OR (mime_type LIKE 'image/%' AND mime_type <> 'image/svg+xml')
  )
);

CREATE INDEX IF NOT EXISTS scene_assets_scene_idx   ON public.scene_assets(scene_id);
CREATE INDEX IF NOT EXISTS scene_assets_project_idx ON public.scene_assets(project_id);
CREATE INDEX IF NOT EXISTS scene_assets_user_idx    ON public.scene_assets(user_id);

-- Idempotent migration: don't re-upload an image that already has a cloud asset.
CREATE UNIQUE INDEX IF NOT EXISTS scene_assets_client_uidx
  ON public.scene_assets(scene_id, client_image_id)
  WHERE client_image_id IS NOT NULL;

DROP TRIGGER IF EXISTS set_scene_assets_updated_at ON public.scene_assets;
CREATE TRIGGER set_scene_assets_updated_at
  BEFORE UPDATE ON public.scene_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- RLS for all tables above is in 0003_framefore_rls_policies.sql.
-- =============================================================================
