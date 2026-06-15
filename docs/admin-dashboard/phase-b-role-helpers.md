# Phase B — Admin Role Helpers

Status: implemented as read-only frontend foundation.

## What changed

- Added `src/admin/types.ts`.
- Added `src/admin/lib/roles.ts`.
- Added `src/admin/store/useAdminRoleStore.ts`.
- Wired the store from `src/App.tsx` so roles load after auth initializes and
  reset on sign-out/account switch.
- Simplified `src/pages/AdminPage.tsx` to an honest placeholder only.

No Admin Dashboard UI, AdminGuard, admin navigation, user tables, audit-log UI,
metrics, role-management UI, Edge functions, or cloud sync were added.

## Migration decision

No `supabase/migrations/0009_current_user_admin_roles.sql` was added in this
phase.

The existing `0006_admin_roles.sql` already provides the safe primitives needed
for Phase B:

- `user_roles` can be selected by the current user for their own rows.
- `is_owner()` checks the current caller only.
- `is_admin()` checks the current caller only and treats `owner` as admin.
- `has_current_user_role(role)` exists for self-only checks if needed later.

The frontend does not call `admin_has_app_role()` because that helper is for
admin-checked inspection of other users, not current-user bootstrapping.

## Role helper behavior

`getCurrentAdminRoles()` uses the shared browser anon Supabase client from
`src/lib/supabase.ts`.

It:

- returns safe non-admin data when Supabase is unconfigured;
- returns safe non-admin data when no user is authenticated;
- reads only the current user's `user_roles` rows;
- calls `is_owner()` and `is_admin()` for access booleans;
- never uses a service-role key;
- never queries another user's role rows;
- returns friendly generic errors instead of raw database details;
- logs raw errors only in development.

The resulting shape is:

```ts
{
  roles: AdminRole[];
  isOwner: boolean;
  isAdmin: boolean;
  canAccessAdmin: boolean;
}
```

`canAccessAdmin` is always `isOwner || isAdmin`.

## MVP access rule

For MVP admin access:

- `owner` can access future `/admin`.
- `admin` can access future `/admin`.
- `support` cannot access future `/admin` yet.
- `reviewer` cannot access future `/admin` yet.

Support and reviewer roles may appear in `roles`, but they do not make
`canAccessAdmin` true.

## Store behavior

`useAdminRoleStore` stores:

- `roles`
- `isOwner`
- `isAdmin`
- `canAccessAdmin`
- `loading`
- `initialized`
- `error`

Actions:

- `loadRoles()`
- `reset()`
- `clearError()`

The store dedupes concurrent loads for the same user. It also checks the current
auth identity again before committing a load result, so a slower response from a
previous account cannot grant stale access after sign-out or account switch.

The store is independent from the project canvas store and does not import or
write to `useStore`.

## App integration

`src/App.tsx` only performs root-level synchronization:

- after auth initializes, load roles for the current signed-in user;
- on sign-out, reset admin roles;
- on account switch, reset and reload for the new user.

No route protection was added in Phase B. `/app` remains local-first and open as
before.

## QA notes

Run:

```bash
npm run build
```

Manual checks:

- Supabase unconfigured: app does not crash; admin roles stay non-admin.
- Signed out: admin roles stay non-admin.
- Normal signed-in user: `roles` is empty or non-admin; `canAccessAdmin` is
  false.
- Support/reviewer signed-in user: role appears if present; `canAccessAdmin` is
  false.
- Admin signed-in user: `isAdmin` and `canAccessAdmin` are true.
- Owner signed-in user: `isOwner`, `isAdmin`, and `canAccessAdmin` are true.
- Sign out then sign in as another user in the same browser: old roles are not
  reused.
- `/app` still loads local-first and does not depend on admin role loading.

Recommended next phase: Phase C, adding `AdminGuard` and the four-state
no-flicker route protection from `05-admin-routes-and-navigation.md`.
