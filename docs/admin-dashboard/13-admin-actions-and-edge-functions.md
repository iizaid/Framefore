# 13 — Admin Actions & Edge Functions

## What must NOT be done directly from the frontend

These all require the service role (which bypasses RLS) or capabilities the anon
client doesn't have. **None may ever run in the browser:**

- Reading `auth.users` (email, last_sign_in_at, provider, confirmation).
- Banning / suspending users.
- Deleting users (`auth.admin.deleteUser`).
- Deleting storage folders / another user's objects.
- Forced project/content deletion.
- Viewing another user's storage object (mint signed URL with service role).
- Sending system emails / password-reset links on a user's behalf.
- Exporting global/bulk data.
- Running maintenance jobs (orphan cleanup, retention purges).
- Any global role change requiring stronger control than the existing RPCs.

> Note: role grant/revoke is the **exception** that's safe from the browser —
> because `grant_app_role`/`revoke_app_role` are RLS-checked `SECURITY DEFINER`
> functions, not raw writes. Everything else above is not.

## Edge Function catalog (all future)

Every function follows the same contract:

```
1. Parse the user's JWT from Authorization header (forwarded by the client).
2. Resolve caller uid; reject if missing/invalid (401).
3. Assert role server-side: call is_admin()/is_owner() (or check user_roles)
   with the *caller's* identity — never trust a body field. (403 if insufficient.)
4. Validate & bound inputs.
5. Do the privileged work with the service-role client.
6. Write an admin_audit_events row (actor, target, action, metadata).
7. Optionally record rate_limit_events for throttling.
8. Return a minimal, sanitized response. Never leak raw DB errors or PII beyond need.
```

| Function | Purpose | Input | Authz | Service-role use | Audit action | Rate limit | Key failure states |
|---|---|---|---|---|---|---|---|
| `admin-list-users` | Paginated user list incl. auth metadata | cursor, limit, search | `is_admin()` | read `auth.users` + join profiles/roles | `listed_users` (optional) | per-admin/min | 401, 403, 400 bad cursor |
| `admin-get-user-detail` | One user's full record | `userId` | `is_admin()` | read auth + profile + roles + audit | `viewed_user` / `viewed_pii` on reveal | low | 404 unknown user |
| `admin-update-user-status` | Suspend / unsuspend / ban | `userId, status, reason` | suspend: `is_admin()`; ban: `is_owner()` | write `account_status`; maybe `auth.admin` | `suspended_user`/`banned_user` | low | last-owner/self guard, 403 |
| `admin-storage-cleanup` | Report/delete orphan objects | `mode: report\|delete, userId?` | `is_admin()` (delete: `is_owner()`) | Storage list/remove | `storage_cleanup` | very low | partial failures reported |
| `admin-view-storage-object` | Signed URL for a user's object | `path` | `is_admin()` | `createSignedUrl` | `viewed_storage_object` | per-admin/min | 404, path not owned-by-target |
| `admin-export-audit` | CSV/JSON audit export | date range | `is_admin()` | read `admin_audit_events` | `exported_audit` | strict | range too large |
| `admin-system-health` | DB/storage/fn health | — | `is_admin()` | probes | (none) | low | timeout → "unknown" |
| `admin-create-support-event` | Append a support note | `userId, note` | `is_admin()` | write `admin_support_notes` | `support_note_added` | low | note too long |
| `admin-delete-user` | Delete a user (last resort) | `userId, confirm` | `is_owner()` | `auth.admin.deleteUser` (cascades) | `deleted_user` | strict | self/last-owner block, double-confirm |

## Frontend calling pattern

```ts
// src/admin/lib/edge.ts (planned). Mirrors lib/profile.ts discipline.
async function callAdminFn<T>(name: string, body: unknown): Promise<Result<T>> {
  const { client, error } = requireClient();        // reuse supabase guard
  if (!client) return { data: null, error };
  const { data, error: e } = await client.functions.invoke(name, { body });
  if (e) return { data: null, error: friendlyEdgeError(e) };
  return { data: data as T, error: null };
}
```

`supabase.functions.invoke` automatically attaches the session's access token, so
the function receives the caller's JWT — that's how step 3 above authorizes.

## Secrets & deployment

- Service-role key + any IP-hash salt live **only** in Edge function secrets
  (`supabase secrets set`), never in `VITE_*` vars or the repo.
- Functions deployed via `supabase functions deploy`; runtime not yet set up
  (prerequisite for any privileged action — see [22](22-production-hardening-checklist.md)).

## Acceptance criteria (per function, when built)

- Calling without admin role → 403; signed out → 401.
- A request body claiming a different caller id is ignored (authz uses JWT).
- Every privileged effect writes exactly one audit row.
- No service-role key appears in any client bundle.
- Errors are sanitized (no raw Postgres/Storage internals to the client).
