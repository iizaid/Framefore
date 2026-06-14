# 07 — User Projects & Progress Persistence Plan

How an authenticated user's work is saved to and loaded from Supabase, while the
golden rule and local-first behavior survive.

## Ownership model
- Each `projects` row has `user_id`. A project belongs to exactly one user.
- All children (`scenes`, `scene_assets`, `scene_links`, `canvas_*`) carry the
  same `user_id` and a `project_id`. RLS ([06](06-row-level-security-rls-plan.md))
  guarantees isolation.
- No sharing in MVP — single-owner only. (Sharing is a future phase; the schema
  doesn't preclude it.)

## Source of truth
| Mode | Source of truth | Cache |
|---|---|---|
| Signed out / no env | IndexedDB (`framefore-state`) | — (it *is* the truth) |
| Signed in | **Supabase Postgres** | IndexedDB mirror for offline/perf |

When signed in, the cloud is authoritative. The local IndexedDB copy becomes a
**cache + offline buffer**, reconciled by sync ([09](09-project-sync-strategy.md)).

## What gets saved and how

### Project metadata
`updateProject` → debounced upsert into `projects` (title, platform, global
JSONB, narration, etc.). `updated_at` set server-side via trigger or client.

### Scenes (ordered)
- `addScene`/`updateScene`/`deleteScene` → upsert/delete the matching `scenes`
  row.
- **`reorderScenes` → rewrite `order_index` for the project's scenes.** Because
  the local action recomputes the whole array, the simplest correct sync is to
  send the full ordered list of `{scene_id, order_index}` and batch-update.
- Export reads `order by order_index` → identical to local array order. ✅

### Canvas data (visual only)
- `setSceneLayout` → update `scenes.layout` JSONB. **Layout writes never touch
  `order_index`.** This is the structural guarantee that moving a card on the
  canvas cannot change video order.
- Notes/sections/links → upsert/delete their tables.

### Project settings
- `global` JSONB + `default*Model` columns on `projects`.
- Per-user prefs → `user_settings.preferences`.

### Exports
- **Exports stay fully client-side** ([src/lib/export.ts](../src/lib/export.ts)).
  After loading a project from the cloud and reconstructing the `Project` object
  (doc 05 read path), `toMarkdown/toPromptPack/...` run unchanged. No server
  export generation in MVP ([16](16-api-and-edge-functions-plan.md)).

## Autosave design
- Reuse the existing pattern: every mutation already bumps `updatedAt` via
  `touch()`. Add a **debounced sync layer** (e.g. 800ms–2s after last change)
  that diffs dirty entities and pushes them.
- Granularity: per-entity upserts (project row, changed scene rows, changed
  canvas rows) rather than re-uploading the whole project each keystroke.
- Mark entities dirty on mutation; flush on debounce, on blur, on route change,
  and on `beforeunload` (best-effort).
- Show a subtle "Saved / Saving…" indicator.

> **Implementation note:** this layer wraps `useStore`; it must NOT change
> `useStore`'s local persistence. Local IndexedDB write stays as-is; cloud sync
> is additive. See [09](09-project-sync-strategy.md).

## Lifecycle scenarios

### User logs out
- Cloud sync stops. Local IndexedDB still holds the last-synced copy.
- Projects remain visible/usable locally (local-first). No deletion.
- Optional: offer "clear local cache on logout" as an explicit setting (default
  OFF) for shared computers.

### User logs back in (same device)
- Load projects from cloud → reconcile with local cache by `updated_at`
  (last-write-wins, doc 09). Cloud generally wins as source of truth.

### User logs in on a new device
- No local projects (or different ones). Fetch all cloud projects → populate
  cache → render. If local projects also exist (used app offline first), trigger
  the migration prompt ([08](08-local-to-cloud-migration-plan.md)).

### Across devices (concurrent-ish)
- MVP: **last-write-wins per project** using `updated_at`. Not real-time. A later
  edit on device B overwrites device A's older `updated_at`.
- Mitigation against silent loss: compare `updated_at` before overwriting; if
  remote is newer than the local base, warn/merge (doc 09 conflict basics).

## Conflict handling (basics)
- Track a per-project `base_updated_at` (the value when loaded).
- On push: if `remote.updated_at > base_updated_at` → conflict. MVP resolution:
  keep most recent by `updated_at`, surface a toast "This project changed on
  another device — reloaded the latest version." Detailed strategy in
  [09](09-project-sync-strategy.md).

## Data we deliberately do NOT cloud-persist (MVP)
- `canvasHistory` (undo/redo stacks) — in-memory only, like today.
- `hydrated` flag.
- Object-URL caches for images (regenerated from Storage on demand).

## Acceptance criteria
- Create project signed in → appears in `projects` with correct `user_id`.
- Edit scene → row updated, `updated_at` advances.
- Reorder scenes → `order_index` updated; reload → same order; export order
  matches. **Golden rule holds.**
- Move a canvas card → only `layout` changes; export order unchanged.
- Log out / log in on another device → same projects appear.
