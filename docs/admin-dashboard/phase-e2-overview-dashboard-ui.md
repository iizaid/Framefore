# Phase E2 — Overview Dashboard UI

Status: implemented with real aggregate metrics only.

## What changed

- Added `src/admin/store/useAdminOverviewStore.ts`.
- Added `src/admin/components/AdminMetricCard.tsx`.
- Added `src/admin/components/AdminMetricGrid.tsx`.
- Added `src/admin/components/AdminOverviewSkeleton.tsx`.
- Added `src/admin/components/AdminOverviewErrorState.tsx`.
- Added `src/admin/components/AdminOverviewStatusPanel.tsx`.
- Updated `src/pages/AdminPage.tsx` to render the real Overview dashboard.
- Updated `docs/admin-dashboard/README.md`.

No fake metrics, charts, user tables, role-management UI, audit/security tables,
Edge Functions, migrations, direct browser admin table reads, or cloud sync were
added.

## Data source

The Overview UI uses one source:

```ts
loadAdminOverviewMetrics()
```

That helper calls:

```sql
public.admin_get_overview_metrics()
```

All visible numbers come from the Phase E1 aggregate RPC. The page does not query
`auth.users`, `public.user_roles`, `public.admin_audit_events`, or any other
admin table directly from the browser.

## Store behavior

`useAdminOverviewStore` stores:

- `data`
- `loading`
- `initialized`
- `error`
- `unavailable`
- `lastLoadedAt`

Actions:

- `loadOverview()`
- `refresh()`
- `reset()`
- `clearError()`

The store:

- dedupes concurrent requests;
- uses a request generation counter to ignore stale async results;
- does not auto-fetch globally;
- loads only when `AdminPage` mounts after `AdminGuard` has allowed access;
- refuses to load when there is no signed-in user or `canAccessAdmin` is false;
- resets when `AdminPage` unmounts;
- keeps the previous valid data visible if a later refresh fails.

## Metric sections

Platform:

- Total users
- New users - 7 days
- New users - 30 days

Profiles:

- Total profiles
- Completed profiles
- Uploaded avatars
- Profile completion rate, computed from real `completed / total`

Roles:

- Owners
- Admins
- Support
- Reviewers

Events:

- Admin audit - 24h
- Admin audit - 7d
- Security events - 24h
- Security events - 7d
- Rate-limit events - 24h
- Rate-limit events - 7d

Cloud database rows:

- Cloud project rows
- Cloud scene rows
- Cloud scene asset rows

Storage:

- Avatar objects
- Reference image objects

## Null and unavailable metrics

`null` values are never rendered as `0`.

Storage object counts currently return `null` from the RPC, so the cards display
`Deferred`. If the backend later returns a real `0`, the UI will display `0`
because that value is sourced.

If total profiles is `0`, the profile completion rate displays `No profiles yet`
instead of a fake percentage.

## Cloud row labeling

Cloud metrics are labelled as database rows:

- `Cloud project rows`
- `Cloud scene rows`
- `Cloud scene asset rows`

They are not labelled as total projects. Copy on the page states that local-first
browser projects are not counted.

## Why no charts were added

The RPC returns current aggregate counts only. There is no real historical time
series yet, so charts would imply data that does not exist.

## Intentionally not implemented

- No users table.
- No user detail page.
- No role management UI.
- No audit log table.
- No security events table.
- No rate-limit table.
- No storage moderation UI.
- No system settings UI.
- No nested admin routes.
- No charts.
- No fake rows or fake activity.
- No Edge Functions.
- No migrations.
- No broad RLS policies.
- No service-role usage.
- No `admin_has_app_role()` usage.
- No `/app` changes.
- No cloud sync.

## Manual QA checklist

- Owner/admin opens `/admin`: sees loading skeleton briefly, then overview cards
  populated from the RPC.
- Refresh button reloads metrics and updates `lastLoadedAt`.
- Missing RPC or unapplied migration shows a friendly unavailable/error state and
  does not crash.
- Non-admin cannot access `/admin` because `AdminGuard` stops before overview
  loading.
- Support/reviewer remain forbidden in MVP.
- Storage `null` metrics show `Deferred`, not `0`.
- Cloud rows are labelled as database rows only, not local project totals.
- No hardcoded demo metrics, charts, fake users, or fake audit rows are present.
- `/app` remains local-first and opens without auth.
- Local projects are untouched.
- `npm run build` passes.

## Next phase

Recommended next phase: Phase F1, users-list data contract, or a narrow audit
data contract. Keep the same rule: build the secure data contract before the UI.
