# Platform-1 — Admin Server-State & Validation Foundation

Status: implemented as an engineering foundation only. No Users UI, no
`/admin/users` route, no admin actions, no visual redesign, and no migrations
were added in this phase.

## What this phase adds

- **TanStack Query** (`@tanstack/react-query`) — server-state management for the
  Admin Console.
- **TanStack Table** (`@tanstack/react-table`) — installed and ready for the
  upcoming Users/Audit/Security tables. Not yet used by any component.
- **Zod** (`zod`) — runtime validation/parsing of admin RPC payloads.
- A shared `QueryClient` (`src/lib/queryClient.ts`) wired in at the app root via
  `QueryClientProvider` in `src/main.tsx`.
- Stable admin query keys (`src/admin/lib/queryKeys.ts`).
- Zod schemas for the Overview metrics and Users list contracts, wired into the
  existing data helpers.

## Why each library

- **Why TanStack Query:** admin data is *server state* — it is fetched, cached,
  goes stale, and is refetched. Query gives us caching, dedupe, stale/refetch
  control, retry policy, and request lifecycle out of the box, which is exactly
  what the Users/Audit/Security tables need (search, filter, pagination,
  background refresh) without hand-rolling another store like the Overview one.
- **Why TanStack Table:** the upcoming tables need headless sorting, column
  models, and pagination wiring while we keep full control of the premium custom
  markup. Headless (vs. AG Grid) keeps the bundle small and the styling ours.
- **Why Zod:** the RPCs return `jsonb`. TypeScript can only *assert* a shape;
  Zod *verifies* it at the trust boundary. A drifted/older RPC or a malformed
  row now fails closed into a safe "unavailable" state instead of leaking an
  unexpected object into typed UI code.
- **Why Zustand remains:** Zustand is the right tool for *client* state that
  lives only in the browser and has no server lifecycle.

## State ownership split

| State | Owner |
|---|---|
| Auth session / user | Zustand (`useAuthStore`) |
| Admin role flags / access | Zustand (`useAdminRoleStore`) |
| Local-first app/project/canvas state | Zustand (`useStore`) |
| Admin Overview metrics (current) | Zustand (`useAdminOverviewStore`) — kept as-is |
| Future admin server data (Users, Audit, Security) | TanStack Query |

**Rule going forward:** new admin server data is fetched with TanStack Query.
Existing local/client/auth/access state stays in Zustand. We are **not**
migrating the whole app to Query and **not** removing Zustand.

## Overview store decision

`useAdminOverviewStore` is intentionally **kept unchanged** this phase. It is
stable, handles user-switch race conditions and in-flight dedupe, and rewriting
it would be churn with no user-visible benefit. `AdminPage` is untouched beyond
what the build requires (nothing). The Overview helper now validates its payload
with Zod, but the store contract is identical. The Overview may be migrated to
TanStack Query later if convenient, but it is not required.

## Query key structure

Defined in `src/admin/lib/queryKeys.ts`:

```ts
adminQueryKeys = {
  all: ["admin"],
  overview: () => ["admin", "overview"],
  users: {
    all: ["admin", "users"],
    list: (params) => ["admin", "users", "list", normalizedFilters],
  },
}
```

The Users list key includes `search`, `role`, `profileCompleted`, `limit`, and
`offset`. Inputs are normalized first (`normalizeAdminUsersListFilters`): empty/
whitespace search collapses to `null`, numbers are truncated, and missing values
become `null`. This keeps keys serializable and deterministic so equivalent
queries share one cache entry instead of fragmenting it.

## RPC payload validation

- `src/admin/lib/overview.schema.ts` validates `admin_get_overview_metrics()`.
- `src/admin/lib/users.schema.ts` validates `admin_list_users()`.

Behavior:

- On a schema mismatch the helper returns a safe `unavailable` result; it never
  crashes and never surfaces raw Zod internals to normal UI. Issue details are
  logged with `console.warn` in development only.
- Schemas describe **only** the minimal safe fields. There is no field for
  `avatar_path`, raw auth metadata, phone, bio, city, country, or creative
  content, so such data can never reach validated output.
- The Users schema drops invalid rows (e.g. empty `userId`) and filters unknown
  role strings instead of failing the whole list, preserving the Phase F1
  hardening behavior. `userId` must be a non-empty string.

## QueryClient defaults

- `queries.staleTime`: `30_000`
- `queries.gcTime`: `5 * 60_000`
- `queries.refetchOnWindowFocus`: `false`
- `queries.retry`: retries up to 2 times, but never for forbidden/invalid-filter/
  missing-RPC errors (`isRetryableAdminError`)
- `mutations.retry`: `0`

## What is intentionally deferred

- **React Hook Form** — added with the first real admin form (later phase).
- **Sentry / PostHog** — observability/analytics are a later, isolated decision.
- **shadcn CLI / AG Grid / Recharts / ECharts** — not needed for the headless,
  custom-component approach in the MVP.
- **React Query Devtools** — skipped for now to avoid extra surface.

## What Phase F2 should use

Phase F2 (Production Users List UI) should build the table from:

- `loadAdminUsers()` only (no direct browser reads from `auth.users`, no admin
  table reads, no `service_role`, no `admin_has_app_role`);
- TanStack Query with `adminQueryKeys.users.list(...)`;
- TanStack Table for the headless table model;
- the Zod-validated `AdminUsersListResult` shape;
- no fake rows.

`/admin` remains owner/admin-only. `/app` stays local-first with no cloud sync.
