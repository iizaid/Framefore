# 09 — Project Visibility & Support Plan

## The honest truth the UI must reflect

Framefore is **local-first**. Project data lives in each user's browser
(IndexedDB `framefore-state` v9 + `framefore-images`), filtered locally by
`ownerUserId` ([useStore.ts](../../src/store/useStore.ts)). The cloud tables
(`projects`, `scenes`, `scene_links`, `canvas_*`, `scene_assets`) exist
([0002](../../supabase/migrations/0002_framefore_core_tables.sql)) but are
**empty** because no sync writes to them yet ([SCHEMA_OVERVIEW.md](../../supabase/SCHEMA_OVERVIEW.md)).

**Therefore the Admin Console cannot truthfully show "all user projects."** It
can only ever show what has been *synced to the cloud*, which today is nothing.

## What admin CAN show now

- Counts/listings from the **cloud** `projects`/`scenes` tables — which return 0
  until sync exists. So in practice: nothing meaningful.
- That's it. There is no server-side visibility into a user's local browser data,
  and there should not be (it's on their device).

## What admin CANNOT show (and must not pretend to)

- Local-only projects sitting in users' browsers. They are unreachable by design.
- A "total projects across all users" number — it would be wrong (cloud-only).
- Any per-user creative content while the app is local-first.

## Avoiding a misleading admin UI

The `/admin/projects` route must render a **clearly-labelled future state**:

```
┌ Projects ─────────────────────────────────────────────┐
│  Project oversight isn't available yet.                │
│                                                        │
│  Framefore is local-first: project data lives in each  │
│  user's browser until cloud sync ships. The cloud      │
│  project tables exist but are empty by design.         │
│                                                        │
│  This section will populate after the cloud-sync phase.│
└────────────────────────────────────────────────────────┘
```

No fake rows, no "0 projects" stat presented as activity, no charts.

## After cloud sync (future design)

When sync lands, an admin **project metadata viewer** can show, per project
(from `projects`/`scenes`, admin-scoped via view or Edge fn):

| Field | Source |
|---|---|
| title, platform, aspect_ratio | `projects` |
| scene count | `count(scenes where project_id=…)` |
| updated_at | `projects.updated_at` |
| owner (display name) | join `profiles` |
| storage footprint | sum `scene_assets.size_bytes` |

### The golden rule in the admin UI (must never break)

If the console ever shows scenes, it must order them by **`scenes.order_index`
ASC** — the real video order — exactly as the export query does
([0002](../../supabase/migrations/0002_framefore_core_tables.sql)):

```sql
SELECT * FROM public.scenes WHERE project_id = $1 ORDER BY order_index ASC;
```

The admin UI must **never** present canvas data (`scenes.layout`, `canvas_notes`,
`canvas_sections`, `canvas_links`, `scene_links`) as if it defined export/video
order. Canvas = visual thinking space only. If a future "project preview" shows a
canvas snapshot, label it explicitly as "visual layout (not export order)".

## Direct edits by support/admin

- **Default: no.** Support/reviewer get **no** access to project content.
- `0006` deliberately ships **no admin RLS on content tables**
  ([ADMIN_MODEL.md](../../supabase/ADMIN_MODEL.md)). Keep it that way.
- Any future support operation on content (e.g., "user can't load a corrupted
  project") must:
  1. run in an Edge Function with the service role,
  2. require a stated reason,
  3. write an `admin_audit_events` row (action + reason + target),
  4. be the **minimum** access needed (prefer metadata over full content).

## Privacy stance

User prompts, narration scripts, and reference images are the user's creative IP
and may contain sensitive material. Admins/support must **not** browse them
casually. Reading content is an exceptional, justified, audited action — never a
default capability and never available to support/reviewer in MVP.

## Acceptance criteria

- `/admin/projects` shows the honest "not available yet" state with no fabricated
  data while the app is local-first.
- No admin code reads or attempts to read local IndexedDB of other users (it
  can't, but no UI should imply it can).
- When cloud sync ships, any scene listing orders by `order_index` and labels
  canvas data as non-sequencing.
