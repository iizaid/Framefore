# Phase E1 — Overview Data Contract

Status: implemented as a backend/frontend contract only.

## What changed

- Added `supabase/migrations/0009_admin_overview_metrics.sql`.
- Added `src/admin/lib/overview.ts`.
- Extended `src/admin/types.ts` with overview metric types.
- Updated `docs/admin-dashboard/README.md`.

No Overview metric cards, charts, users table, audit UI, role-management UI,
Edge Functions, broad RLS policies, or cloud sync were added.

## Migration added

`0009_admin_overview_metrics.sql` creates:

```sql
public.admin_get_overview_metrics()
```

The function returns one `jsonb` payload for the future Overview dashboard.

## RPC security model

- Callable only by authenticated users.
- Revoked from `public` and `anon`.
- Granted to `authenticated`.
- Internally checks `public.is_admin()`.
- Non-admin callers receive an insufficient-privilege error.
- Uses `SECURITY DEFINER` only to produce aggregate counts without broad client
  SELECT policies.
- Uses explicit `search_path`.
- Uses no dynamic SQL.
- Accepts no target user argument.

This is still not a substitute for server-side authorization on future
privileged actions.

## Metrics included

Users, aggregate only:

- `users.total`
- `users.new7d`
- `users.new30d`

Profiles, aggregate only:

- `profiles.total`
- `profiles.completed`
- `profiles.withUploadedAvatar`

Roles:

- `roles.owners`
- `roles.admins`
- `roles.support`
- `roles.reviewers`

Events, aggregate only:

- `events.adminAudit24h`
- `events.adminAudit7d`
- `events.security24h`
- `events.security7d`
- `events.rateLimit24h`
- `events.rateLimit7d`

Cloud database rows, aggregate only:

- `cloudRows.projects`
- `cloudRows.scenes`
- `cloudRows.sceneAssets`

Metadata:

- `generatedAt`
- `sourceVersion: "phase-e1"`
- `cloudSyncEnabled: false`

Storage:

- `storage.avatars: null`
- `storage.referenceImages: null`

## Metrics intentionally excluded

The RPC does not return:

- user rows;
- emails;
- provider identities;
- last sign-in timestamps;
- avatar paths or URLs;
- storage object names or paths;
- project prompts or creative content;
- scene prompts, narration, or notes;
- audit/security/rate-limit event metadata;
- IP hashes or raw IP addresses;
- per-user activity rows.

## Why `auth.users` is accessed only through the RPC

The frontend must not read `auth.users` directly. The RPC accesses it only inside
an admin-only aggregate function and returns counts, never auth metadata or user
records.

## Why cloud metrics are named `cloudRows`

Framefore is still local-first. `cloudRows.projects`, `cloudRows.scenes`, and
`cloudRows.sceneAssets` count database rows only. They are not total user
projects and may be zero until cloud sync exists.

## Storage metrics decision

Bucket/object counts were intentionally left as `null` in Phase E1. `profiles`
already exposes the safe aggregate `withUploadedAvatar`. Direct Storage object
counting can be revisited with the storage moderation plan or an audited Edge
Function. No object paths or names are exposed.

## Frontend helper

`loadAdminOverviewMetrics()` in `src/admin/lib/overview.ts`:

- uses the existing browser anon Supabase client;
- calls `admin_get_overview_metrics()`;
- does not use `service_role`;
- does not query `auth.users` or admin tables directly from the browser;
- maps the RPC result into `AdminOverviewMetrics`;
- returns a safe unavailable state when Supabase is unconfigured;
- returns friendly errors for forbidden or missing-RPC cases;
- logs raw details only in development.

No overview store was added in this phase. Phase E2 can add it when the UI needs
loading, retry, and cache behavior.

## Why no UI cards were added

Phase E1 exists to establish the data contract first. Phase E2 should build
Overview cards only from this real RPC payload. No fake metric card, chart, or
placeholder number should be introduced.

## Manual SQL apply notes

Apply the migration after `0008_profile_account_fields_and_avatars.sql`:

```bash
supabase db push
```

or apply the SQL through the Supabase SQL editor for the target project.

## Manual QA checklist

- Non-admin authenticated user calls `admin_get_overview_metrics`: forbidden
  error, no data returned.
- Signed out user: cannot call RPC successfully.
- Owner/admin user: RPC returns aggregate JSON.
- Owner/admin RPC response contains no user rows, emails, avatar paths, project
  content, scene prompts, storage paths, event metadata, or IP hashes.
- Frontend helper returns typed data for owner/admin.
- Frontend helper returns safe errors for forbidden or missing RPC.
- Frontend helper does not crash if Supabase is unconfigured.
- `/admin` still shows the Phase D shell and does not show metric cards yet.
- `/app` remains local-first, has no auth gate, and has no cloud sync.
- `npm run build` passes.

## Next phase

Phase E2: build the Overview Dashboard UI using real metrics from
`loadAdminOverviewMetrics()` only.
