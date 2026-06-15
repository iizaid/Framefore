# Phase D — Admin Layout Shell

Status: implemented as a protected shell only.

## What changed

- Added `src/admin/components/AdminLayout.tsx`.
- Added `src/admin/components/AdminSidebar.tsx`.
- Added `src/admin/components/AdminTopbar.tsx`.
- Added `src/admin/components/AdminShellEmptyState.tsx`.
- Added `src/admin/components/AdminRoleBadge.tsx`.
- Added `src/admin/components/AdminNavItem.tsx`.
- Updated `src/pages/AdminPage.tsx` to render inside the admin shell.
- Updated `docs/admin-dashboard/README.md`.

No real dashboard data, metrics, users table, role-management UI, audit UI,
security UI, Edge Functions, migrations, or cloud sync were added.

## Layout structure

`AdminLayout` wraps protected admin content with:

- a left sidebar on desktop;
- a compact horizontal sidebar section on smaller screens;
- a topbar above the content area;
- a constrained main content container.

The layout is presentational only. It does not fetch Supabase admin data and it
does not assume cloud sync exists.

## Sidebar behavior

`AdminSidebar` shows:

- Framefore Admin;
- "Protected console";
- active Overview item;
- future modules marked as planned:
  - Users
  - Roles
  - Audit Logs
  - Security Events
  - Abuse / Rate Limits
  - Storage
  - Projects
  - System Health
  - Settings

Future module items are disabled planning markers, not clickable links. There are
no fake counts and no routes to missing pages.

## Topbar behavior

`AdminTopbar` shows:

- page title: Admin console;
- status badge: MVP access: owner/admin;
- current role badges from `useAdminRoleStore`;
- links to `/app` and `/profile`.

It does not duplicate sign-out logic and does not add account-management actions.

## AdminPage behavior

`AdminPage` now renders an honest shell overview:

- current implementation status;
- planned modules list;
- production guardrails.

It intentionally avoids fake metrics, fake users, fake audit rows, charts, and
dangerous action buttons.

## Why no fake metrics were added

The admin docs require every number to come from a real table, RPC, or Edge
Function. Phase D has no data producers, so the UI uses honest planned states
instead of zeros, charts, or placeholder rows.

## Why no Supabase admin data fetching was added

Phase D is layout-only. Admin data reads begin in later phases after the exact
RLS/RPC/Edge Function contracts are implemented and reviewed.

## Why no Edge Functions or migrations were added

This phase does not add privileged actions or new data surfaces. No database or
service-role work is needed for a presentational shell.

## Manual QA checklist

- Signed out user visits `/admin`: redirected to `/login`; no layout flash.
- Normal authenticated user visits `/admin`: Forbidden state; no layout flash.
- Support/reviewer user visits `/admin`: Forbidden in MVP.
- Owner/admin visits `/admin`: sees admin shell, sidebar, topbar, and honest
  placeholder content.
- Sidebar future modules: clearly marked Planned/disabled; no broken links; no
  fake counts.
- Topbar: shows owner/admin MVP access status, current role badges, and working
  links to `/app` and `/profile`.
- AdminPage: no fake metrics, fake data, or dangerous actions.
- Mobile: layout remains readable and avoids horizontal page overflow.
- `/app`: still opens without sign-in; local projects untouched.
- `npm run build` passes.

## Next phase

Recommended next phase: Phase E, only if the safe table reads for overview
metrics are implemented from real sources. Otherwise keep the shell honest and
continue with static runbook or security foundation work.
