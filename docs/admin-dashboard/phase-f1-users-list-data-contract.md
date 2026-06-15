# Phase F1 - Users List Data Contract

Status: implemented as a backend/frontend contract only.

## What changed

- Added `supabase/migrations/0010_admin_users_list.sql`.
- Added `src/admin/lib/users.ts`.
- Extended `src/admin/types.ts` with users-list contract types.
- Updated `docs/admin-dashboard/README.md`.

No Users page, Users route, table component, user detail page, role-management UI,
admin actions, Edge Functions, broad RLS policies, fake users, service-role
usage, or cloud sync were added.

## Migration added

`0010_admin_users_list.sql` creates:

```sql
public.admin_list_users(
  p_search text default null,
  p_role text default null,
  p_profile_completed boolean default null,
  p_limit integer default 25,
  p_offset integer default 0
)
```

The function returns one paginated `jsonb` payload for the future Users list.

## RPC security model

- Callable only by authenticated users.
- Revoked from `public` and `anon`.
- Granted to `authenticated`.
- Internally checks `public.is_admin()`.
- Non-admin callers receive an insufficient-privilege error.
- Uses `SECURITY DEFINER` only to read a safe, minimal admin users summary
  without adding broad frontend SELECT policies.
- Uses explicit `SET search_path = public, auth, pg_temp`.
- Uses no dynamic SQL.
- Accepts no target user argument.
- Does not call `admin_has_app_role()` from the frontend.

Support and reviewer roles still do not pass `canAccessAdmin`; only owner/admin
callers should reach this RPC through the current AdminGuard flow.

## Validation

The RPC normalizes:

- `p_search`: trimmed; empty strings become `null`.
- `p_limit`: clamped to `1..100`, default `25`.
- `p_offset`: clamped to `>= 0`, default `0`.

The RPC validates:

- `p_role` is `null` or one of `owner`, `admin`, `support`, `reviewer`.
- invalid roles raise a validation error.

## Filters

- Search checks `auth.users.email` and display name only.
- Display name is derived from `profiles.full_name` or `profiles.nickname`.
- Role filter includes users holding the selected role.
- Profile-completed filter checks `profiles.profile_completed`.
- Pagination uses `limit` and `offset`.
- Ordering is stable: `auth.users.created_at desc`, then `auth.users.id desc`.

## Response shape

```json
{
  "generatedAt": "2026-06-15T00:00:00.000Z",
  "sourceVersion": "phase-f1",
  "page": {
    "limit": 25,
    "offset": 0,
    "returned": 0,
    "total": 0,
    "hasMore": false
  },
  "filters": {
    "search": null,
    "role": null,
    "profileCompleted": null
  },
  "users": [
    {
      "userId": "00000000-0000-0000-0000-000000000000",
      "email": "owner@example.com",
      "displayName": "Owner",
      "createdAt": "2026-06-15T00:00:00.000Z",
      "lastSignInAt": "2026-06-15T00:00:00.000Z",
      "profileCompleted": false,
      "hasUploadedAvatar": false,
      "roles": ["owner"],
      "isOwner": true,
      "isAdmin": true
    }
  ]
}
```

## Fields included

- `userId`
- `email`
- `displayName`
- `createdAt`
- `lastSignInAt`
- `profileCompleted`
- `hasUploadedAvatar`
- `roles`
- `isOwner`
- `isAdmin`

Email is intentionally included because this is an owner/admin-only internal
contract. The function still returns only the minimum user summary needed for a
future list.

## Fields intentionally excluded

The RPC does not return:

- raw auth metadata;
- provider identities;
- phone number;
- country, city, timezone, or bio;
- `avatar_url`;
- `avatar_path`;
- storage object paths or names;
- project prompts or creative content;
- scene prompts, narration, or notes;
- audit/security/rate-limit event metadata;
- IP hashes or raw IP addresses.

`hasUploadedAvatar` is a boolean derived from `profiles.avatar_path IS NOT NULL`;
the private storage path itself is never returned.

## Frontend helper

`loadAdminUsers()` in `src/admin/lib/users.ts`:

- uses the existing browser anon Supabase client;
- calls `admin_list_users()` only;
- does not use `service_role`;
- does not query `auth.users` directly from the browser;
- maps the RPC result into `AdminUsersListResult`;
- clamps `limit` and `offset` client-side before calling the RPC;
- trims empty search strings to `null`;
- validates the role filter before the RPC call;
- returns a safe unavailable state when Supabase is unconfigured;
- returns friendly errors for forbidden, invalid-filter, or missing-RPC cases;
- logs raw details only in development.

No users Zustand store was added in this phase. A store should be added with the
Users UI only if the table needs request dedupe, retry, cache, and stale-result
protection.

## Why no Users UI was added

Phase F1 exists to establish the secure data contract first. Phase F2 should
build the Users table only from `loadAdminUsers()` and must not add fake rows or
direct browser reads from `auth.users`.

## Manual SQL apply notes

Apply the migration after `0009_admin_overview_metrics.sql`:

```bash
supabase db push
```

or apply the SQL through the Supabase SQL editor for the target project.

## Manual QA checklist

- Signed-out user cannot call `admin_list_users` successfully.
- Non-admin authenticated user receives an insufficient-privilege error.
- Owner/admin user receives paginated users JSON.
- Invalid role filter fails with a validation error.
- Empty search string is returned as `filters.search: null`.
- Negative offset is clamped to `0`.
- Limit below `1` is clamped to `1`.
- Limit above `100` is clamped to `100`.
- Role filter returns only users with the selected role.
- Profile-completed filter matches `profiles.profile_completed`.
- Response contains no raw auth metadata, phone, bio, location fields, avatar
  paths, storage paths, project content, or scene content.
- Frontend helper returns typed data for owner/admin.
- Frontend helper returns safe errors for forbidden, invalid-filter, or missing
  RPC cases.
- Frontend helper does not crash if Supabase is unconfigured.
- `/admin` still shows the existing Overview shell only.
- No `/admin/users` route or Users table exists yet.
- `/app` remains local-first, has no auth gate, and has no cloud sync.
- `npm run build` passes.

## Next phase

Phase F2: build the Users list UI using real rows from `loadAdminUsers()` only.
