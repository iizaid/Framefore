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
  updated_at          timestamptz NOT NULL DEFAULT now()
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
  updated_at          timestamptz NOT NULL DEFAULT now()
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
  updated_at    timestamptz NOT NULL DEFAULT now()
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
  updated_at  timestamptz NOT NULL DEFAULT now()
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
  updated_at  timestamptz NOT NULL DEFAULT now()
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
  updated_at      timestamptz NOT NULL DEFAULT now()
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
  updated_at        timestamptz NOT NULL DEFAULT now()
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
