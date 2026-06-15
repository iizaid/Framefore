# 05 — Admin Routes & Navigation

## Route table

All admin routes nest under `/admin` and render inside a shared `AdminLayout`.
This is additive to [src/App.tsx](../../src/App.tsx) — the existing flat routes
stay as-is.

> **MVP gate: owner/admin only.** `is_admin()` covers owner+admin and there are
> no console read policies for support/reviewer yet, so **every route below
> requires owner/admin in MVP.** The "Min role" column shows the *intended*
> long-term floor; cells naming `support`/`reviewer` are **🔮 future** and only
> take effect once a staff helper + read policies are added (see
> [03](03-role-permissions-matrix.md), [24](24-open-questions-and-decisions.md)).

| Route | Component | Min role (intended) | MVP gate | Notes |
|---|---|---|---|---|
| `/admin` | `OverviewPage` | support 🔮 | owner/admin | index |
| `/admin/users` | `UsersPage` | support 🔮 | owner/admin | table |
| `/admin/users/:userId` | `UserDetailPage` | support 🔮 | owner/admin | detail + role actions |
| `/admin/roles` | `RolesPage` | admin (view: support 🔮) | owner/admin | role mgmt |
| `/admin/audit` | `AuditPage` | admin | owner/admin | log viewer |
| `/admin/security` | `SecurityPage` | admin | owner/admin | empty until producers |
| `/admin/abuse` | `AbusePage` | admin | owner/admin | Edge-fn backed |
| `/admin/storage` | `StoragePage` | admin | owner/admin | avatars now |
| `/admin/projects` | `ProjectsPage` | admin | owner/admin | future-gated state |
| `/admin/system` | `SystemPage` | admin | owner/admin | health |
| `/admin/settings` | `SettingsPage` | owner | owner | future |
| `/admin/docs` | `RunbookPage` | support 🔮 | owner/admin | static |
| `/admin/*` | `AdminNotFound` | (any admin) | owner/admin | in-console 404 |

### Router shape (planned)

```tsx
// In App.tsx <Routes>, replace the single placeholder line:
//   <Route path="/admin" element={<AdminPage />} />
// with a nested block (AdminLayout lazy-loaded like the other pages):
<Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
  <Route index element={<OverviewPage />} />
  <Route path="users" element={<UsersPage />} />
  <Route path="users/:userId" element={<UserDetailPage />} />
  <Route path="roles" element={<RolesPage />} />
  <Route path="audit" element={<AuditPage />} />
  <Route path="security" element={<SecurityPage />} />
  <Route path="abuse" element={<AbusePage />} />
  <Route path="storage" element={<StoragePage />} />
  <Route path="projects" element={<ProjectsPage />} />
  <Route path="system" element={<SystemPage />} />
  <Route path="settings" element={<SettingsPage />} />
  <Route path="docs" element={<RunbookPage />} />
  <Route path="*" element={<AdminNotFound />} />
</Route>
```

`AdminLayout` renders `<Outlet />` for the active child. Per-route role gating
beyond "is admin at all" is handled inside `AdminGuard`/pages via a
`requiredRole` check (owner-only sections short-circuit to a Forbidden panel).

## Access-control states (the four that matter)

The guard must distinguish four states and never flash admin chrome:

1. **Auth not initialized** (`useAuthStore.initialized === false`) or **role
   loading** → render a minimal `AdminBootScreen` (neutral, no admin nav).
2. **Signed out** → `<Navigate to="/login?redirect=/admin/...">` (preserve the
   attempted path so login can bounce back).
3. **Signed in, not admin** → `AdminForbidden` (403 panel, link back to `/app`),
   **not** a redirect (a redirect leaks "this exists / you almost had it"; an
   explicit, calm 403 is clearer and avoids loops). **In MVP this includes
   `support` and `reviewer`** — they hold a role but no console access yet, so
   they see Forbidden until a staff helper + read policies land
   ([03](03-role-permissions-matrix.md)).
4. **Signed in, sufficient role (owner/admin in MVP)** → render the layout + route.

### No-flicker contract

This is the single most important UX/security detail. Sequence:

```
mount AdminGuard
  ├─ if !authStore.initialized  -> AdminBootScreen (wait)
  ├─ else if !user              -> redirect /login?redirect=...
  ├─ else if role === undefined -> AdminBootScreen (role fetch in flight)
  ├─ else if !roleAllowed       -> AdminForbidden   // MVP: roleAllowed = isAdmin() (owner|admin)
  └─ else                       -> children
```

- `roleAllowed` in MVP is simply **owner or admin**; support/reviewer evaluate to
  `false` and land on `AdminForbidden` until a staff helper + read policies are
  added ([03](03-role-permissions-matrix.md)).
- Admin UI is **never** rendered before `role` resolves (prevents a
  "saw the dashboard for 200ms then got kicked" flash).
- The role fetch is a single RPC (`has_current_user_role` per needed role, or one
  `get_current_user_roles` view/RPC — see [14](14-database-views-rpcs-and-migrations.md)),
  cached in a `useRoleStore` so navigating between admin routes doesn't re-flash.
- When Supabase is unconfigured, treat as signed-out → redirect to `/login`
  which already explains the unconfigured state.

## Layout & navigation

- **AdminLayout:** fixed left `AdminSidebar` (desktop), `AdminTopbar`, scrollable
  content with `AdminBreadcrumbs`.
- **AdminSidebar:** grouped nav (Overview · People[Users, Roles] · Trust &
  Safety[Audit, Security, Abuse] · Infrastructure[Storage, Projects, System] ·
  Settings · Runbook). **Items the caller's role can't access are hidden**
  (cosmetic) — they 403 server-side anyway.
- **AdminTopbar:** current admin's avatar + role badge, environment label
  (e.g. `prod`/`staging` from an env var), a "Back to app" link, sign out.
- **Breadcrumbs:** `Admin / Users / <name>` etc. Deep links work because each
  route fetches its own data from the URL (`:userId`) on mount.
- **Mobile:** sidebar collapses into a sheet/drawer toggled from the topbar;
  tables switch to stacked cards ([16](16-ui-ux-design-system.md)). Admin is
  desktop-first but must not be broken on mobile.

## Deep-link behavior

- `/admin/users/:userId` loads that user directly (data keyed off the param).
- An unknown `:userId` → in-page "User not found" empty state, not a crash.
- Unknown sub-path → `AdminNotFound` inside the layout (keeps nav visible).
- Any deep link still passes through `AdminGuard` first.
