# 05 — Database Schema Plan

Postgres schema mapping the Framefore domain model ([src/types.ts](../src/types.ts))
to Supabase. **Reference SQL only — do not auto-run in this phase.**

## Design decisions

1. **`scenes` is a separate table with an explicit `order_index`.** The local
   model stores scenes as an *ordered array*; relational rows have no inherent
   order, so we add `order_index int not null`. **This column is the cloud
   equivalent of array position = video order = export order** (the golden
   rule). Export rebuilds the array via `order by order_index`.
2. **Canvas data is visual-only and stays clearly separated.** `scene.layout`
   and the `canvas_*` tables never carry sequencing meaning.
3. **JSONB for high-churn, schema-flexible bags.** `project.global`
   (`GlobalSettings`) and the large bundle of scene "notes/craft" fields can be
   stored as JSONB to avoid 35 columns and ease future field additions, while
   first-class columns are kept for anything queried/ordered/indexed.
4. **Every user-owned row has `user_id uuid` → `auth.users(id)`** for RLS.
5. **`updated_at` everywhere** for last-write-wins sync (mirrors `touch()`).

> **Alternative considered:** store each whole project as a single JSONB blob in
> one `projects` row. Simpler migration, but loses per-scene querying, makes
> partial sync impossible, and bloats row size. **Chosen: normalized projects +
> scenes, JSONB only inside a scene row and for `global`.** See
> [20](20-open-questions-and-decisions.md) for the decision record.

## Entity-relationship overview

```
auth.users (Supabase managed)
   │ 1
   ├──1 profiles
   ├──* projects ──* scenes ──* scene_assets (→ Storage object)
   │       ├──* canvas_notes
   │       ├──* canvas_sections
   │       └──* canvas_links   (fromNode/toNode across scenes/notes/sections)
   │       └──* scene_links    (scene→scene visual links)
   └──1 user_settings
```

## Conventions
- PK: `id uuid default gen_random_uuid()` (except `profiles.id = auth.users.id`).
- Timestamps: `created_at timestamptz default now() not null`,
  `updated_at timestamptz default now() not null`.
- All FKs `on delete cascade` from parent (project deletion removes its scenes,
  assets, canvas data — mirrors local `deleteProject`).
- `client_id text` columns store the original local nanoid for idempotent
  migration (see [08](08-local-to-cloud-migration-plan.md)).

---

## Table: `profiles`
**Purpose:** public-ish per-user info (name, avatar). Already drafted in
[docs/supabase-auth-setup.md](../docs/supabase-auth-setup.md).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | = `auth.users.id`, `on delete cascade` |
| `full_name` | text | from OAuth/meta |
| `avatar_url` | text | from OAuth |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Auto-created by the `handle_new_user()` trigger (doc 03 / existing setup doc).

---

## Table: `projects`
**Purpose:** one row per Framefore project, owned by a user.

| Column | Type | Maps to |
|---|---|---|
| `id` | uuid PK | new cloud id |
| `user_id` | uuid FK→auth.users | ownership (RLS) |
| `client_id` | text | original local `Project.id` (migration idempotency) |
| `title` | text not null | `title` |
| `description` | text default '' | `description` |
| `topic` | text default '' | `topic` |
| `platform` | text default 'YouTube' | `platform` enum-as-text |
| `aspect_ratio` | text default '16:9' | `aspectRatio` |
| `target_length_sec` | int default 0 | `targetLengthSec` |
| `visual_style` | text default '' | `visualStyle` |
| `mood` | text default '' | `mood` |
| `default_image_model` | text default '' | `defaultImageModel` |
| `default_video_model` | text default '' | `defaultVideoModel` |
| `global` | jsonb default '{}' | `GlobalSettings` object |
| `narration` | text default '' | `narration` (full script) |
| `created_at` | timestamptz | `createdAt` (epoch→tz on migrate) |
| `updated_at` | timestamptz | `updatedAt` (sync key) |

Indexes: `(user_id)`, `(user_id, updated_at desc)`, unique `(user_id, client_id)`.

```sql
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text,
  title text not null default 'Untitled Project',
  description text not null default '',
  topic text not null default '',
  platform text not null default 'YouTube',
  aspect_ratio text not null default '16:9',
  target_length_sec int not null default 0,
  visual_style text not null default '',
  mood text not null default '',
  default_image_model text not null default '',
  default_video_model text not null default '',
  global jsonb not null default '{}'::jsonb,
  narration text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index projects_user_client_uidx on public.projects(user_id, client_id) where client_id is not null;
create index projects_user_updated_idx on public.projects(user_id, updated_at desc);
```

---

## Table: `scenes`  ⭐ golden-rule table
**Purpose:** ordered scenes within a project.

| Column | Type | Maps to |
|---|---|---|
| `id` | uuid PK | |
| `project_id` | uuid FK→projects | parent |
| `user_id` | uuid FK→auth.users | denormalized for simple RLS |
| `client_id` | text | original local `Scene.id` |
| `order_index` | **int not null** | **array position = video order** |
| `title` | text | |
| `subject_name` | text | |
| `summary` | text | |
| `duration_sec` | int | `durationSec` |
| `status` | text | `SceneStatus` |
| `role` | text | `SceneRole` |
| `tag` | text null | legacy `tag?` |
| `color` | text | `ColorLabel` |
| `visual_prompt` | text | |
| `negative_prompt` | text | |
| `narration_part` | text | |
| `transition_to_next` | text | |
| `continuity_notes` | text | |
| `ending_beat` | text | |
| `craft` | jsonb | `{cameraAngle,cameraMovement,mood,lighting,visualStyle}` |
| `notes_bag` | jsonb | `{characterNotes,locationNotes,motionNotes,sfxNotes,musicNotes,notes}` |
| `image_model` | text | `imageModel` (override; '' inherits) |
| `video_model` | text | `videoModel` |
| `layout` | jsonb null | `{x,y}` canvas position — visual only |
| `collapsed` | bool default false | UI |
| `prompt_dir` | text default 'ltr' | |
| `narration_dir` | text default 'ltr' | |
| `created_at`/`updated_at` | timestamptz | |

Indexes: `(project_id, order_index)`, `(user_id)`, unique `(project_id, client_id)`.

> Keeping `visual_prompt`, `negative_prompt`, `narration_part`,
> `transition_to_next`, `continuity_notes`, `ending_beat`, `subject_name`,
> `status`, `role`, `duration_sec` as **first-class columns** because export and
> readiness logic touch them; the rest go in JSONB bags to keep the row sane.

```sql
create table public.scenes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text,
  order_index int not null,
  title text not null default '',
  subject_name text not null default '',
  summary text not null default '',
  duration_sec int not null default 10,
  status text not null default 'Idea',
  role text not null default 'none',
  tag text,
  color text not null default 'none',
  visual_prompt text not null default '',
  negative_prompt text not null default '',
  narration_part text not null default '',
  transition_to_next text not null default '',
  continuity_notes text not null default '',
  ending_beat text not null default '',
  craft jsonb not null default '{}'::jsonb,
  notes_bag jsonb not null default '{}'::jsonb,
  image_model text not null default '',
  video_model text not null default '',
  layout jsonb,
  collapsed boolean not null default false,
  prompt_dir text not null default 'ltr',
  narration_dir text not null default 'ltr',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index scenes_project_order_idx on public.scenes(project_id, order_index);
create unique index scenes_project_client_uidx on public.scenes(project_id, client_id) where client_id is not null;
```

**Reordering:** on save, write the new `order_index` for affected scenes
(simplest: rewrite all indices for the project in one batch, matching how
`reorderScenes` recomputes the whole array). Gaps are fine — only relative order
matters.

---

## Table: `scene_assets`  (reference images)
**Purpose:** metadata for each reference image; binary lives in Storage.
Replaces the local `SceneImage` + `framefore-images` blob store.

| Column | Type | Maps to |
|---|---|---|
| `id` | uuid PK | |
| `scene_id` | uuid FK→scenes | parent |
| `project_id` | uuid FK→projects | for bucket pathing / RLS |
| `user_id` | uuid FK→auth.users | RLS |
| `client_image_id` | text | original `SceneImage.id` (blob key) |
| `storage_path` | text not null | `userId/projectId/sceneId/<uuid>` |
| `name` | text | `SceneImage.name` |
| `mime_type` | text | `SceneImage.type` |
| `size_bytes` | bigint | |
| `position` | int default 0 | order within scene |
| `created_at` | timestamptz | |

See [15](15-storage-and-reference-images-plan.md) for bucket layout + policies.

---

## Table: `scene_links`  (scene→scene visual links)
Maps `Project.links: SceneLink[]`.

| Column | Type | Maps to |
|---|---|---|
| `id` uuid PK | | |
| `project_id` uuid FK | | parent |
| `user_id` uuid FK | | RLS |
| `from_scene_id` uuid FK→scenes | | `fromSceneId` (resolve client→cloud id) |
| `to_scene_id` uuid FK→scenes | | `toSceneId` |
| `label` text null | | |
| `type` text null | | `SceneLinkType` |
| `created_at` | | |

---

## Table: `canvas_notes`
Maps `Project.canvasNotes: CanvasNote[]`. Purely visual — never exported as scenes.

| Column | Type | Maps to |
|---|---|---|
| `id` uuid PK | | |
| `project_id` uuid FK | | |
| `user_id` uuid FK | | |
| `client_id` text | | original `CanvasNote.id` |
| `x` / `y` | int | position |
| `text` | text | |
| `kind` | text default 'idea' | `CanvasNoteKind` |
| `created_at`/`updated_at` | timestamptz | |

---

## Table: `canvas_sections`
Maps `Project.canvasSections: CanvasSection[]`.

| Column | Type | Maps to |
|---|---|---|
| `id` uuid PK | | |
| `project_id` uuid FK | | |
| `user_id` uuid FK | | |
| `client_id` text | | original `CanvasSection.id` |
| `title` | text | |
| `x`/`y`/`width`/`height` | int | frame geometry |
| `type` | text default 'custom' | `CanvasSectionType` |
| `created_at`/`updated_at` | timestamptz | |

---

## Table: `canvas_links`
Maps `Project.canvasLinks: CanvasLink[]` — typed edges across scene/note/section.

| Column | Type | Maps to |
|---|---|---|
| `id` uuid PK | | |
| `project_id` uuid FK | | |
| `user_id` uuid FK | | |
| `from_node_id` text | | resolved cloud id of node |
| `from_node_type` text | | `'scene'\|'note'\|'section'` |
| `to_node_id` text | | |
| `to_node_type` text | | |
| `label` text null | | |
| `type` text default 'note' | | `CanvasLinkType` |
| `created_at` | | |

> Because canvas links can point at scenes, notes, OR sections, store node id as
> text + a `node_type` discriminator rather than a single typed FK
> (matches the local polymorphic model). Integrity is enforced in app code on
> save, as it is today.

---

## Table: `user_settings`
**Purpose:** per-user app preferences not tied to a project (theme, default
models, last-opened project, migration flags).

| Column | Type | Notes |
|---|---|---|
| `user_id` uuid PK FK→auth.users | | one row per user |
| `preferences` jsonb default '{}' | | open bag |
| `has_migrated_local` bool default false | | guards repeat migration prompts |
| `created_at`/`updated_at` | | |

---

## Table: `security_events` (optional / future)
**Purpose:** lightweight audit (login, password change, MFA enroll, migration).

| Column | Type |
|---|---|
| `id` uuid PK |
| `user_id` uuid FK |
| `event_type` text |
| `metadata` jsonb |
| `ip` inet null |
| `created_at` timestamptz |

Write-only from the client (insert own), or better from Edge Functions
([16](16-api-and-edge-functions-plan.md)). Not MVP.

---

## Reconstructing a `Project` from the cloud (read path)
```
select project row
  → scenes order by order_index            (rebuilds the ordered array)
  → scene_assets per scene (order by position) → SceneImage[] (resolve URLs)
  → scene_links, canvas_links, canvas_notes, canvas_sections
  → assemble into the exact Project shape consumed by useStore/export.ts
```
Export then works **unchanged** because it only sees the reconstructed
`project.scenes` array in `order_index` order.

## Migration notes (per table)
- Convert epoch-ms (`createdAt/updatedAt`) → `to_timestamp(ms/1000)`.
- Carry every local id into `client_id` for idempotency + link resolution.
- Resolve link endpoints by mapping `client_id → cloud id` after inserting
  scenes/notes/sections (two-pass insert).
- See [08](08-local-to-cloud-migration-plan.md) for the full algorithm.
