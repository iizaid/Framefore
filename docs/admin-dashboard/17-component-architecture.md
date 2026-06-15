# 17 — Component Architecture

## Folder structure

Keep the admin console **self-contained** under `src/admin/` so it's additive and
never tangled with `/app`. It reuses the shared `src/lib/supabase.ts`,
`src/store/useAuthStore.ts`, and `src/components/ui/*` primitives.

```
src/admin/
  index.ts                 # barrel (optional)
  types.ts                 # AdminRole, RoleSet, UserOverview, AuditEvent, etc.
  lib/
    roles.ts               # get_current_user_roles() wrapper, role helpers
    users.ts               # admin_list_user_overview() + detail fetchers
    audit.ts               # admin_audit_events / security_events readers
    edge.ts                # callAdminFn<T>() wrapper (functions.invoke)
    format.ts              # relative time, id truncation, role labels
  store/
    useRoleStore.ts        # current caller's roles, loading, reset-on-identity
  components/
    AdminLayout.tsx        AdminSidebar.tsx     AdminTopbar.tsx
    AdminGuard.tsx         AdminForbidden.tsx   AdminBootScreen.tsx
    AdminBreadcrumbs.tsx
    AdminMetricCard.tsx    AdminDataTable.tsx   AdminFilterBar.tsx
    AdminSearchInput.tsx   AdminRoleBadge.tsx   AdminUserAvatar.tsx
    AdminAuditTimeline.tsx AdminConfirmDialog.tsx AdminDangerZone.tsx
    AdminEmptyState.tsx    AdminSkeleton.tsx
    UserDetailDrawer.tsx   RoleGrantDialog.tsx
  pages/
    OverviewPage.tsx  UsersPage.tsx  UserDetailPage.tsx  RolesPage.tsx
    AuditPage.tsx  SecurityPage.tsx  AbusePage.tsx  StoragePage.tsx
    ProjectsPage.tsx  SystemPage.tsx  SettingsPage.tsx  RunbookPage.tsx
    AdminNotFound.tsx
```

> The current [src/pages/AdminPage.tsx](../../src/pages/AdminPage.tsx) placeholder
> is replaced by `src/admin/pages/OverviewPage.tsx` wrapped in `AdminLayout`. Keep
> the route name `/admin`.

## Key component contracts

### `AdminGuard`
- Reads `useAuthStore` (`initialized`, `user`) and `useRoleStore` (`roles`,
  `loading`).
- Implements the four-state, no-flicker sequence from
  [05](05-admin-routes-and-navigation.md).
- Optional `requiredRole?: AdminRole` prop for owner-only sub-areas; default is
  "any admin-capable role" (owner/admin/support/reviewer).

### `AdminDataTable<T>`
- Generic, presentational. Props: `columns`, `rows`, `loading`, `error`,
  `emptyState`, `onRowClick`, pagination controls (cursor in/out).
- Owns skeleton/empty/error rendering so every table behaves identically
  ([20](20-notifications-errors-empty-states.md)).

### `RoleGrantDialog`
- Props: `targetUser`, `existingRoles`, `callerRoles`.
- Computes grantable roles from `callerRoles` (owner→all; admin→support/reviewer).
- Calls `roles.ts` → `grant_app_role` RPC; on success refetches + toasts.

### `useRoleStore` (Zustand)
```ts
interface RoleState {
  roles: AdminRole[] | null;   // null = not loaded yet (drives boot screen)
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;   // calls get_current_user_roles()
  has: (r: AdminRole) => boolean;
  isAdmin: () => boolean;      // owner|admin
  isOwner: () => boolean;
  reset: () => void;
}
```
- **Must reset on identity change**, mirroring `useProfileStore`'s subscription
  ([useProfileStore.ts](../../src/store/useProfileStore.ts)), so a second user on
  the same browser never inherits roles.

## Data-layer style (match `lib/profile.ts`)

Every function in `src/admin/lib/*`:
- returns `Result<T>` (`{data,error}`), never throws;
- guards on `requireClient()` (Supabase configured) and the live session;
- maps errors via a `friendlyAdminError()` (sibling of `friendlyDbError`);
- never trusts UI-supplied ids for *authorization* (only for *selection*).

## Reuse, don't reinvent

- UI primitives: `src/components/ui/{Modal,toast,primitives,widgets,ErrorState}`.
- Avatar URL resolution: reuse `getAvatarDisplayUrl` from `lib/profile.ts`.
- Supabase access: the shared client + `isSupabaseConfigured`.
- Do **not** import or touch `useStore` (project/local state) — admin is fully
  decoupled from local project data.

## Lazy loading

Lazy-load `AdminLayout` (and thus the whole admin chunk) in `App.tsx` exactly
like the other pages, so non-admin users never download the admin bundle on a
normal visit.
