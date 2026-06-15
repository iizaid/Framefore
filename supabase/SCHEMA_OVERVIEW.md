# Framefore — Schema Overview

> Status: SQL migrations written and hardened (Phase 4.3.1). **Not yet applied**
> to any Supabase project, and **not wired to the app**. The app remains fully
> local-first (IndexedDB via `framefore-state` / `framefore-images`).

## Tables

| Table | Purpose | Tenant key |
|---|---|---|
| `profiles` | Display name, nickname, bio, contact + avatar (path/url), 1:1 with `auth.users` (0001 + 0008) | `id = auth.users.id` |
| `user_settings` | Theme, migration flag, prefs JSONB | `user_id` |
| `projects` | One Framefore project | `user_id` |
| `scenes` | Ordered scenes — **`order_index` is the video order** | `user_id` + `project_id` |
| `scene_links` | Visual scene→scene arrows (NOT order) | `user_id` + `project_id` |
| `canvas_notes` | Sticky notes (visual only) | `user_id` + `project_id` |
| `canvas_sections` | Labelled frame regions (visual only) | `user_id` + `project_id` |
| `canvas_links` | Polymorphic node edges (visual only) | `user_id` + `project_id` |
| `scene_assets` | Reference-image **metadata** (binary in Storage) | `user_id` + `project_id` + `scene_id` |
| `security_events` | Append-only per-user audit log | `user_id` |
| `user_roles` | Admin role grants (0006) | service-controlled |
| `admin_audit_events` | Append-only privileged-action log (0006) | admin-read |
| `rate_limit_events` | Counters for future Edge-Function limits (0007) | service-only |

## The golden rule (must never break)

```
Timeline = real video order  →  scenes.order_index ASC
Canvas   = visual thinking space only
Export   = ORDER BY order_index, never canvas position / links
```

Canvas data (`scenes.layout`, `canvas_notes`, `canvas_sections`, `canvas_links`,
`scene_links`) is purely visual and carries **zero** sequencing meaning. The
cloud export reconstruction query is always:

```sql
SELECT * FROM public.scenes WHERE project_id = $1 ORDER BY order_index ASC;
```

A manual test in `tests/rls-manual-checks.sql` confirms that moving a scene's
`layout` does not change its `order_index`.

## Three-layer tenant isolation

1. **Composite foreign keys (structural — 0002).** `scenes(id, project_id, user_id)`
   and `projects(id, user_id)` are FK targets. A `scene_link`, `scene_asset`, or
   scene that points at another user's project/scene is *physically unstorable* —
   the constraint rejects it even under the service role or buggy server code.
2. **RLS policies (per-statement — 0003).** Every client statement is scoped to
   `auth.uid()`. UPDATE policies use `WITH CHECK` so a row can't be *rewritten*
   to point at another tenant.
3. **CHECK constraints (payload shape — 0002/0005/0006/0007).** Length/range/JSONB
   shape limits bound abusive payloads.

## JSONB bags

`projects.global`, `scenes.craft`, `scenes.notes_bag` are JSONB objects (enforced
`jsonb_typeof = 'object'`) for high-churn flexible fields. First-class columns are
reserved for anything queried, sorted, or indexed (e.g. `order_index`).

## Indexes (read/write tradeoff)

Hot read paths are indexed; we deliberately avoid indexing every column to keep
writes cheap.

- `projects(user_id, updated_at DESC)` — project list
- `scenes(project_id, order_index)` — timeline load (the golden-rule read)
- `scenes(user_id)`, child `(*_user_idx)` / `(*_project_idx)` — RLS + project load
- unique `(user_id|project_id, client_id)` — idempotent local→cloud migration
- `security_events(user_id, created_at DESC)`, `admin_audit_*`, `rate_limit_*`

See `migrations/0002…0008` for the authoritative DDL.

## Avatars (0008)

`profiles.avatar_path` holds the **private** Storage object path of an uploaded
avatar (bucket `avatars`, convention `<user_id>/avatar/<file>`); display it via
`createSignedUrl()`. `profiles.avatar_url` is the **external** OAuth fallback.
Priority: `avatar_path` → `avatar_url` → rendered initials. Bucket RLS keys on
the first path segment = `auth.uid()`, identical to `reference-images`.
