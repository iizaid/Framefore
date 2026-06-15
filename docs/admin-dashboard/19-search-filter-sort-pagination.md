# 19 — Search, Filter, Sort & Pagination

## Per-table query design

| Table/source | Search fields | Filters | Sort | Pagination |
|---|---|---|---|---|
| Users (`admin_user_overview`) | full_name, nickname (+ email via Edge fn) | role, profile_completed, has_avatar, (provider via Edge fn) | created_at, name | **cursor** on `created_at` |
| Roles (`user_roles`+profiles) | user name/nickname | role | created_at (granted) | cursor on `created_at` |
| Audit (`admin_audit_events`) | actor/target name | action, actor, target, date range | created_at DESC | **cursor** on `(created_at,id)` |
| Security (`security_events`) | user, event_type | event_type, user, date range | created_at DESC | cursor on `(created_at,id)` |
| Abuse (`rate_limit_events`, Edge) | action, key(hash) | action, window | count / created_at | server-aggregated (Edge) |
| Storage | path/name | bucket, size band | size, created_at | cursor (post-sync) |

## Cursor vs offset

**Prefer cursor (keyset) pagination** for the log/list tables:

```ts
// Audit page: stable, index-friendly, no "page drift" as new rows arrive.
let q = supabase.from('admin_audit_events')
  .select('id, actor_user_id, target_user_id, action, metadata, created_at')
  .order('created_at', { ascending: false })
  .order('id', { ascending: false })   // tiebreaker for equal timestamps
  .limit(PAGE);
if (cursor) q = q.lt('created_at', cursor.created_at);  // (+ id tiebreak)
```

- **Why cursor:** audit/security tables grow append-only and are sorted by time;
  offset pagination drifts when new rows land between page loads and gets slow at
  high offsets. Cursor on `(created_at, id)` is stable and index-aligned.
- **Offset is acceptable** only for small, stable sets (e.g. the roles list, which
  is tiny). Use a simple `range()` there if cursor is overkill.

## Sort

- Logs default to `created_at DESC` (newest first).
- Users default to `created_at DESC` (newest signups first); allow name A–Z.
- Always include a deterministic tiebreaker (`id`) so paging is stable.
- Sorting must happen **server-side** (in the query / RPC), never by sorting a
  single fetched page client-side (which would mislead).

## Search

- Debounced input (~300 ms).
- MVP search uses `ilike` on indexed-ish text (`full_name`, `nickname`). For
  larger user bases, consider `pg_trgm` GIN indexes or a `search_vector` column
  (future migration) — note it, don't prematurely add.
- Email search requires the Edge fn (auth.users) — only offered once that exists.

## Filters

- Reflected to the URL query string (`?role=admin&from=2026-01-01`) so views are
  shareable and survive refresh ([16](16-ui-ux-design-system.md)).
- Date-range filter on `created_at` for all log tables.
- Role filter on Users/Roles; action filter on Audit; event_type on Security.

## Performance & indexes (already present / needed)

Existing indexes that help (from migrations):
- `admin_audit_actor_idx (actor_user_id, created_at DESC)`,
  `admin_audit_target_idx (target_user_id, created_at DESC)` — audit by actor/target.
- `user_roles_user_idx`, `user_roles_role_idx` — role filters.
- `security_events_user_created_idx (user_id, created_at DESC)`.
- `rate_limit_user_action_idx`, `rate_limit_ip_action_idx`.

**Likely future indexes (plan in `0009+`, [14](14-database-views-rpcs-and-migrations.md)):**
- `admin_audit_events(created_at DESC, id DESC)` — the default global audit feed
  (current indexes are actor/target-prefixed, not ideal for the unfiltered feed).
- `profiles(created_at DESC)` — users list keyset pagination.
- `security_events(created_at DESC, id)` — admin-wide feed (current index is
  user-prefixed).
- Trigram indexes on `profiles.full_name`/`nickname` if search gets slow.

## Acceptance criteria

- Lists paginate without drift as new rows arrive (cursor verified by inserting a
  row mid-paging).
- Filters/search reflect to URL and restore on reload.
- Sorting and filtering are server-side; a page never sorts only its local slice.
- Large tables stay responsive (queries hit an index; verify with `EXPLAIN`
  before launch on the audit feed).
