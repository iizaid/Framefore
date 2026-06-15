# 14 — Database Views, RPCs & Migrations (planning only)

> **Do not edit applied migrations `0001–0008`.** Everything here is a **future,
> additive** migration (`0009+`), planned now and applied later. All follow the
> existing conventions: `CREATE … IF NOT EXISTS` / `CREATE OR REPLACE`,
> `DROP POLICY IF EXISTS` before `CREATE POLICY`, explicit `SET search_path`,
> EXECUTE revoked from `anon`/`public`, RLS on, audit on privileged writes.

## Why anything new is needed

Today an admin can read `user_roles` and `admin_audit_events` (policies grant
`is_admin()`), but **not** an all-users list (`profiles` is SELECT-own) or a
current-role list for the gate. The additions below close those gaps minimally.

## A. `get_current_user_roles()` — RPC (MVP, needed for the guard)

```sql
CREATE OR REPLACE FUNCTION public.get_current_user_roles()
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(array_agg(role), '{}') FROM public.user_roles WHERE user_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.get_current_user_roles() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_current_user_roles() TO authenticated;
```
- **Why:** the `AdminGuard` needs the caller's full role set in **one** round-trip
  (no flicker), instead of calling `has_current_user_role` four times.
- **Self-only** (reads `auth.uid()`), so no enumeration risk. Frontend-readable.
- **MVP. Required for Phase B/C.**

## B. `admin_user_overview` — view (MVP-ish, unblocks Users list)

```sql
CREATE OR REPLACE VIEW public.admin_user_overview
WITH (security_invoker = true) AS
SELECT p.id, p.full_name, p.nickname, p.avatar_path, p.avatar_url,
       p.profile_completed, p.created_at,
       coalesce(r.roles, '{}') AS roles
FROM public.profiles p
LEFT JOIN LATERAL (
  SELECT array_agg(role) AS roles FROM public.user_roles ur WHERE ur.user_id = p.id
) r ON true;
```
- **Access:** `profiles` RLS is SELECT-own, so a plain `security_invoker` view
  still only returns the caller's row. To make it admin-wide you must **either**
  (a) add an admin SELECT policy on `profiles` (`USING (auth.uid()=id OR is_admin())`),
  **or** (b) make the view `SECURITY DEFINER`-backed via a function that checks
  `is_admin()` and fails closed. **Recommended: (b)** — keep `profiles` strictly
  own-only and expose admin reads through a checked function:

```sql
CREATE OR REPLACE FUNCTION public.admin_list_user_overview(p_limit int, p_before timestamptz)
RETURNS SETOF public.admin_user_overview
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.admin_user_overview
  WHERE public.is_admin() AND (p_before IS NULL OR created_at < p_before)
  ORDER BY created_at DESC LIMIT greatest(1, least(p_limit, 100));
$$;
```
- **Note:** does **not** expose email/last_sign_in (those are `auth.users`, Edge
  fn only — [07](07-user-management-plan.md)). Frontend-readable via RPC.
- **Performance:** uses `profiles.created_at`; add an index if absent.
- **MVP for the Users list.**

## C. `admin_project_overview` — view (FUTURE, post cloud sync)

Columns: `project_id, owner_id, owner_name, title, platform, aspect_ratio,
scene_count, asset_bytes, updated_at`. Built over `projects`/`scenes`/`scene_assets`
with an `is_admin()`-checked function wrapper. **Empty until cloud sync; do not
build the page against it earlier** ([09](09-project-visibility-and-support-plan.md)).

## D. `admin_storage_overview` — view/fn (partial now)

Aggregates avatar counts from `profiles` now; reference-image bytes from
`scene_assets` post-sync. Bucket-level totals need the Storage admin API → Edge
fn ([12](12-storage-and-avatar-moderation.md)).

## E. `admin_daily_metrics` — materialized view (FUTURE)

Daily new-users / actions / (post-sync) projects. Refreshed by a scheduled job.
Only worth it once trends matter; **not MVP** (avoid premature analytics infra).

## F. `admin_support_notes` — table (FUTURE)

```sql
CREATE TABLE public.admin_support_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note text NOT NULL CHECK (char_length(note) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_support_notes ENABLE ROW LEVEL SECURITY;
-- SELECT: is_admin(); INSERT via Edge fn (service role) only, or a checked fn.
```
- **RLS:** admin SELECT; **no client write** (write via `admin-create-support-event`).
- **MVP?** Optional. Useful once support workflows begin.

## G. `account_status` — table (FUTURE, for suspend/ban)

```sql
CREATE TABLE public.account_status (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','banned')),
  reason text, set_by uuid REFERENCES auth.users(id), updated_at timestamptz NOT NULL DEFAULT now()
);
```
- Enforcement is the hard part: a `suspended` flag must actually block access
  (RLS predicate on user tables and/or an auth hook / Edge gate). Design before
  building. **Not MVP.** See [24](24-open-questions-and-decisions.md).

## H. `system_settings` / `feature_flags` — tables (FUTURE)

Key/value, owner-writable (via checked fn), admin-readable. Powers `/admin/settings`.
**Not MVP.**

## Summary

| Object | Type | MVP? | Frontend-readable? | Notes |
|---|---|---|---|---|
| `get_current_user_roles()` | RPC | ✅ | ✅ | guard needs it |
| `admin_list_user_overview()` (+view) | fn+view | ✅ | ✅ | users list; no auth.users fields |
| `admin_project_overview` | view/fn | 🔮 | via fn | post cloud sync |
| `admin_storage_overview` | view/fn | ⚠️ partial | via fn | avatars now |
| `admin_daily_metrics` | matview | 🔮 | via fn | trends later |
| `admin_support_notes` | table | optional | read only | write via Edge fn |
| `account_status` | table | 🔮 | read only | needs enforcement design |
| `system_settings`/`feature_flags` | table | 🔮 | read only | owner writes |

Each future migration must be re-run-safe and ship with its own manual RLS test
in `supabase/tests/`, matching the existing `rls-manual-checks.sql` pattern.
