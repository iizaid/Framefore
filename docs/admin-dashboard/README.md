# Framefore Admin Dashboard — Planning Package

> **Status: PLANNING PACKAGE + PHASE B/C/D/E1/E2 FOUNDATION.** The Admin
> Overview is implemented with real aggregate metrics only; other Admin Dashboard
> UI data modules are not implemented. Phase B added read-only current-user role
> helpers and a Zustand role store; see
> [phase-b-role-helpers.md](phase-b-role-helpers.md). Phase C added `AdminGuard`
> for `/admin`; see [phase-c-admin-guard.md](phase-c-admin-guard.md). Phase D
> added the protected admin layout shell; see
> [phase-d-admin-layout-shell.md](phase-d-admin-layout-shell.md). Phase E1 added
> the safe Overview metrics data contract and aggregate RPC; see
> [phase-e1-overview-data-contract.md](phase-e1-overview-data-contract.md).
> Phase E2 added the Overview UI using `admin_get_overview_metrics()` only; see
> [phase-e2-overview-dashboard-ui.md](phase-e2-overview-dashboard-ui.md). Users
> table, audit UI, role-management UI, and cloud sync still do not exist. The app
> is still fully local-first (IndexedDB:
> `framefore-state` / `framefore-images`, store `version 9`). These documents
> describe **what to build later and how**, grounded in the real current codebase
> and the applied Supabase migration design (`0001–0009`).

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

Phase E2 is now implemented using real aggregate metrics only. The next
recommended implementation phase is a focused data contract for the next module
before building more UI.

> **Codex reconciliation note (updated):** Codex's pre-admin cleanup has now
> **landed**. In place today: the Profile redesign
> ([ProfilePage.tsx](../../src/pages/ProfilePage.tsx)), the avatar crop editor
> ([AvatarCropDialog.tsx](../../src/components/account/AvatarCropDialog.tsx)),
> the `AccountMenu` cleanup
> ([AccountMenu.tsx](../../src/components/account/AccountMenu.tsx) — now just
> Profile + Sign out, no admin link), scoped "smart" loading
> ([AppLoadingScreen.tsx](../../src/components/AppLoadingScreen.tsx)), and the
> closure checklist ([docs/pre-admin-closure-checklist.md](../pre-admin-closure-checklist.md)).
> This planning package has been reconciled against that branch. **The Admin
> Dashboard modules beyond Overview are still not implemented** — `/admin` now
> has a protected shell and real aggregate Overview at
> [src/pages/AdminPage.tsx](../../src/pages/AdminPage.tsx). Future modules still
> need their own secure data contracts before UI work.
