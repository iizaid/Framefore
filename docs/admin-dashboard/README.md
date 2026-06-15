# Framefore Admin Dashboard — Planning Package

> **Status: PLANNING PACKAGE + PHASE B/C/D/E1/E2/F1/P1/F2 + AUTH-1.1 + ADMIN VISUAL REFRESH.** The Admin
> Overview is implemented with real aggregate metrics only; the Users list has a
> secure data contract and a read-only Users UI. Phase B added read-only
> current-user role
> helpers and a Zustand role store; see
> [phase-b-role-helpers.md](phase-b-role-helpers.md). Phase C added `AdminGuard`
> for `/admin`; see [phase-c-admin-guard.md](phase-c-admin-guard.md). Phase D
> added the protected admin layout shell; see
> [phase-d-admin-layout-shell.md](phase-d-admin-layout-shell.md). Phase E1 added
> the safe Overview metrics data contract and aggregate RPC; see
> [phase-e1-overview-data-contract.md](phase-e1-overview-data-contract.md).
> Phase E2 added the Overview UI using `admin_get_overview_metrics()` only; see
> [phase-e2-overview-dashboard-ui.md](phase-e2-overview-dashboard-ui.md). Phase
> F1 added the Users list data contract and safe `admin_list_users()` RPC; see
> [phase-f1-users-list-data-contract.md](phase-f1-users-list-data-contract.md).
> **Phase F1 hardening applied** (`0011_admin_users_list_hardening.sql`): search
> length cap (100), `LIKE` wildcard escaping, lowercase role normalization,
> offset cap (10000), and supporting `public` indexes.
> **Platform-1 admin server-state foundation implemented**: TanStack Query is
> available (provider wired at the app root), TanStack Table is available, and
> Zod runtime validation now guards the Overview and Users RPC payloads; see
> [platform-1-admin-server-state-foundation.md](platform-1-admin-server-state-foundation.md).
> Zustand still owns auth/role/local state; the Overview store is unchanged.
> **Platform-1.1 strict Users schema patch + Phase F2 Users List UI
> implemented**: `/admin/users` exists and is protected by `AdminGuard`, the
> users table loads from the `admin_list_users` RPC only (TanStack Query +
> TanStack Table), with URL-backed search/filter/pagination — see
> [phase-f2-users-list-ui.md](phase-f2-users-list-ui.md). No user management
> actions, no user detail page, and `/app` stays local-first.
> **Phase Auth-1 verified-account gate implemented**: `/app` is now behind
> `AppAccessGuard` (sign-in + verified email required), a `/verify-email` page
> exists, an owner/admin-only "Admin console" entry was added to the account
> menu (UX only — `AdminGuard` is still the boundary), and signed-out landing
> CTAs route to `/signup` instead of `/app`. `/app` stays local-first after
> access is granted; no cloud sync. See [auth-access-gate.md](../auth-access-gate.md).
> **Auth-1.1 polish applied**: OAuth preserves safe intended routes through
> callback, `/verify-email` can resend with only a pending email, the footer FAQ
> reflects the verified-account gate, and the mobile landing drawer shows Admin
> Console only for initialized owner/admin access.
> **Admin visual hard reset applied**: the V1/V2 visual refresh direction was
> superseded by a black-sidebar, flat white workspace, table-first production
> console. The admin now avoids card-soup, boxed loading states, white planned
> pills, grid/canvas backgrounds, and centered narrow dashboard content; see
> [admin-visual-hard-reset.md](admin-visual-hard-reset.md). This did not add new
> data features or admin actions.
> Audit UI, role-management UI, and cloud sync still do not exist.
> The app
> is still fully local-first (IndexedDB:
> `framefore-state` / `framefore-images`, store `version 9`). These documents
> describe **what to build later and how**, grounded in the real current codebase
> and the applied Supabase migration design (`0001–0011`).

This package is the production blueprint for Framefore's internal Admin Console:
a serious operational tool for the `owner`, `admin`, `support`, and `reviewer`
roles defined in [supabase/migrations/0006_admin_roles.sql](../../supabase/migrations/0006_admin_roles.sql).

## Reading order

Read in numeric order. The package is structured as: **why → audit → goals →
permissions → IA/routes → per-section plans → security → UI/components → data →
QA/hardening → roadmap → decisions.**

| # | File | What it answers |
|---|---|---|
| 00 | [00-admin-dashboard-overview.md](00-admin-dashboard-overview.md) | What/why/who; architecture diagram; production principles |
| 01 | [01-current-system-audit.md](01-current-system-audit.md) | Exactly what exists in the repo today and the gaps |
| 02 | [02-admin-goals-and-non-goals.md](02-admin-goals-and-non-goals.md) | MVP scope vs. explicit non-goals |
| 03 | [03-role-permissions-matrix.md](03-role-permissions-matrix.md) | Strict role × action matrix |
| 04 | [04-information-architecture.md](04-information-architecture.md) | Sections, data sources, required roles |
| 05 | [05-admin-routes-and-navigation.md](05-admin-routes-and-navigation.md) | Routes, guards, layout, no-flicker |
| 06 | [06-dashboard-home-and-metrics.md](06-dashboard-home-and-metrics.md) | Home metrics, sourced honestly |
| 07 | [07-user-management-plan.md](07-user-management-plan.md) | Users list + detail, auth.users access |
| 08 | [08-role-management-plan.md](08-role-management-plan.md) | Grant/revoke flows, owner safety |
| 09 | [09-project-visibility-and-support-plan.md](09-project-visibility-and-support-plan.md) | Why projects are mostly invisible until cloud sync |
| 10 | [10-security-events-and-audit-logs.md](10-security-events-and-audit-logs.md) | Audit + security log viewers |
| 11 | [11-rate-limit-and-abuse-monitoring.md](11-rate-limit-and-abuse-monitoring.md) | Honest abuse-monitoring boundary |
| 12 | [12-storage-and-avatar-moderation.md](12-storage-and-avatar-moderation.md) | Buckets, signed URLs, moderation |
| 13 | [13-admin-actions-and-edge-functions.md](13-admin-actions-and-edge-functions.md) | What must run server-side |
| 14 | [14-database-views-rpcs-and-migrations.md](14-database-views-rpcs-and-migrations.md) | Future views/RPCs/migrations (planning) |
| 15 | [15-rls-and-service-role-security.md](15-rls-and-service-role-security.md) | The security model in depth |
| 16 | [16-ui-ux-design-system.md](16-ui-ux-design-system.md) | Premium-minimal admin visual system |
| 17 | [17-component-architecture.md](17-component-architecture.md) | React component + folder structure |
| 18 | [18-state-data-fetching-and-cache.md](18-state-data-fetching-and-cache.md) | Data fetching, role loading, no flicker |
| 19 | [19-search-filter-sort-pagination.md](19-search-filter-sort-pagination.md) | Table query strategy + indexes |
| 20 | [20-notifications-errors-empty-states.md](20-notifications-errors-empty-states.md) | Every UX state |
| 21 | [21-testing-and-qa-plan.md](21-testing-and-qa-plan.md) | Full QA plan |
| 22 | [22-production-hardening-checklist.md](22-production-hardening-checklist.md) | Launch checklist |
| 23 | [23-implementation-roadmap.md](23-implementation-roadmap.md) | Phased build plan A→M |
| 24 | [24-open-questions-and-decisions.md](24-open-questions-and-decisions.md) | Decision log |
| B | [phase-b-role-helpers.md](phase-b-role-helpers.md) | Implemented current-user role helper/store notes |
| C | [phase-c-admin-guard.md](phase-c-admin-guard.md) | Implemented `/admin` guard and access states |
| D | [phase-d-admin-layout-shell.md](phase-d-admin-layout-shell.md) | Implemented protected admin layout shell |
| E1 | [phase-e1-overview-data-contract.md](phase-e1-overview-data-contract.md) | Implemented safe aggregate Overview metrics contract |
| E2 | [phase-e2-overview-dashboard-ui.md](phase-e2-overview-dashboard-ui.md) | Implemented Overview UI using real aggregate metrics only |
| F1 | [phase-f1-users-list-data-contract.md](phase-f1-users-list-data-contract.md) | Implemented safe Users list data contract |
| P1 | [platform-1-admin-server-state-foundation.md](platform-1-admin-server-state-foundation.md) | Implemented admin server-state foundation (TanStack Query/Table, Zod) |
| F2 | [phase-f2-users-list-ui.md](phase-f2-users-list-ui.md) | Implemented Users List UI (+ strict page schema) using `admin_list_users` only |
| Auth-1.1 | [../auth-access-gate.md](../auth-access-gate.md) | Applied safe OAuth intent, verify-email resend polish, and mobile admin link |
| Cleanup | [admin-metrics-charts-cleanup.md](admin-metrics-charts-cleanup.md) | Applied admin cleanup and metrics refactoring |
| Visual V2 | [admin-visual-system-refresh-v2.md](admin-visual-system-refresh-v2.md) | Applied Shopify-like full-width table-first admin redesign |
| Hard reset | [admin-visual-hard-reset.md](admin-visual-hard-reset.md) | Applied black-sidebar flat production admin hard reset |
| G | [phase-g-users-command-actions.md](phase-g-users-command-actions.md) | Implemented safe audited role management actions (Grant/Revoke) on the Users page |

## Hard rules this package obeys

1. **No service-role key in the browser, ever.** Privileged actions go through
   Edge Functions. See [15](15-rls-and-service-role-security.md), [13](13-admin-actions-and-edge-functions.md).
2. **The frontend admin gate is convenience, not security.** Postgres RLS + the
   role functions in `0006` are the boundary.
3. **No fake metrics or fake buttons.** Every number/action must be sourced from
   a real table or function, or it does not ship. See [06](06-dashboard-home-and-metrics.md).
4. **Every privileged mutation is audited** to `admin_audit_events`.
5. **The user-facing app must not break.** `/app` stays local-first. The admin
   build touches *new* files only.
6. **Respect the golden rule.** Timeline (`scenes.order_index`) = video order;
   canvas = visual only; export = `ORDER BY order_index`. The admin UI must never
   imply canvas layout defines export order. See [09](09-project-visibility-and-support-plan.md).

## Next recommended implementation phase

Auth-1.1 and the Admin Visual Hard Reset are now applied. The next feature phase
should stay narrow and contract-first: either a read-only user detail contract
or a role-management design pass with audited server-side mutation boundaries.

> **Codex reconciliation note (updated):** Codex's pre-admin cleanup has now
> **landed**. In place today: the Profile redesign
> ([ProfilePage.tsx](../../src/pages/ProfilePage.tsx)), the avatar crop editor
> ([AvatarCropDialog.tsx](../../src/components/account/AvatarCropDialog.tsx)),
> the `AccountMenu` cleanup
> ([AccountMenu.tsx](../../src/components/account/AccountMenu.tsx) — now just
> Profile + Sign out, no admin link), scoped "smart" loading
> ([AppLoadingScreen.tsx](../../src/components/AppLoadingScreen.tsx)), and the
> closure checklist ([docs/pre-admin-closure-checklist.md](../pre-admin-closure-checklist.md)).
> This planning package has been reconciled against that branch. `/admin` now
> has a protected shell and real aggregate Overview at
> [src/pages/AdminPage.tsx](../../src/pages/AdminPage.tsx). `/admin/users` now
> has a protected read-only table backed by
> [src/admin/lib/users.ts](../../src/admin/lib/users.ts). User actions, user
> detail, audit UI, role-management UI, and cloud sync are still not implemented.
