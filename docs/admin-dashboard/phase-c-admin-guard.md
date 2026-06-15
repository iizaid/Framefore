# Phase C — AdminGuard

Status: implemented for the existing `/admin` placeholder route.

## What changed

- Added `src/admin/components/AdminGuard.tsx`.
- Added `src/admin/components/AdminAccessStates.tsx`.
- Wrapped `/admin` in `src/App.tsx` with `AdminGuard`.
- Kept `src/pages/AdminPage.tsx` as a minimal honest placeholder.

No Admin Dashboard UI, AdminLayout, sidebar, topbar, users table, role-management
UI, metrics, audit/security UI, migrations, Edge functions, or cloud sync were
added.

## How AdminGuard works

`AdminGuard` reads:

- `useAuthStore.initialized`
- `useAuthStore.user`
- `useAdminRoleStore.loading`
- `useAdminRoleStore.initialized`
- `useAdminRoleStore.canAccessAdmin`
- `useAdminRoleStore.error`

It renders the admin placeholder only after auth is initialized, a user exists,
roles are initialized, and `canAccessAdmin` is true.

`src/App.tsx` still performs root-level role synchronization. It now uses a
layout effect for admin role sync so account switches clear stale admin access
before the browser paints `/admin`.

## No-flicker states

1. Auth/session not initialized: show compact admin loading.
2. Signed out: redirect to `/login` with the attempted location in router state.
3. Signed in but roles are loading or not initialized: show compact admin loading.
4. Signed in but not allowed: show `AdminForbidden`, with no redirect loop and no
   admin placeholder flash.
5. Signed in and allowed: render the protected `/admin` placeholder.

## MVP role rule

MVP admin access is owner/admin only.

`canAccessAdmin` remains `isOwner || isAdmin`, so:

- `owner` can open `/admin`.
- `admin` can open `/admin`.
- `support` is forbidden in MVP.
- `reviewer` is forbidden in MVP.

Support/reviewer remain future roles until staff read helpers and policies are
added.

## Security boundary

This guard is UX route protection only. It prevents placeholder UI flashes and
keeps non-admin users out of the client route, but it is not the final security
boundary.

Privileged admin actions must still be protected by Postgres RLS,
`SECURITY DEFINER` RPC checks, Edge Functions, server-side audit logging, and no
service-role key in the browser.

## What was not implemented

- No Admin Dashboard UI.
- No AdminLayout.
- No admin navigation.
- No users, roles, audit, security, abuse, storage, metrics, or system pages.
- No fake data.
- No migration `0009`.
- No Supabase migration edits.
- No service-role usage.
- No `admin_has_app_role()` usage.
- No `/app` protection.
- No local project migration.
- No cloud sync.

## Manual QA checklist

- Signed out user visits `/admin`: no AdminPage flash; redirected to `/login`.
- Normal authenticated user visits `/admin`: no AdminPage flash; forbidden state
  shown.
- Support/reviewer user visits `/admin`: forbidden state shown in MVP.
- Owner user visits `/admin`: AdminPage placeholder shown.
- Admin user visits `/admin`: AdminPage placeholder shown.
- Switch from owner/admin account to normal account: old admin page/access does
  not flash; forbidden or login state appears correctly.
- Refresh `/admin` while signed in as admin: compact loading while auth/roles
  resolve, then placeholder.
- Refresh `/admin` while signed in as non-admin: compact loading while auth/roles
  resolve, then forbidden.
- Missing Supabase config: app does not crash; admin unavailable state is shown.
- `/app` still opens without sign-in.
- Local projects are untouched.
- `npm run build` passes.

## Next phase

Recommended next phase: Phase D, the Admin layout shell with honest empty
placeholders only. Do not start real metrics, users, roles, or audit modules
until their data producers and security checks are in place.
