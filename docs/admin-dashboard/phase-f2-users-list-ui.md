# Phase F2 — Users List UI (+ Platform-1.1 strict schema patch)

Status: implemented. This is the first real Users module UI. It is a read-only
list with search, filters, and pagination, backed only by the existing
`admin_list_users` RPC through `loadAdminUsers()`. No user management actions,
no user detail page, and no direct table reads were added.

## What was implemented

- **Platform-1.1**: the Users list `page` object is now validated with a strict
  non-negative-integer schema (see below).
- A protected `/admin/users` route and a real Users page.
- A production users table (TanStack Table, headless) with toolbar, pagination,
  and skeleton/empty/error states.
- Real sidebar links for **Overview** and **Users**; every other module stays
  disabled/planned.

## Files changed

New:

- `src/admin/pages/AdminUsersPage.tsx`
- `src/admin/components/users/AdminUsersTable.tsx`
- `src/admin/components/users/AdminUsersToolbar.tsx`
- `src/admin/components/users/AdminUsersPagination.tsx`
- `src/admin/components/users/AdminUsersEmptyState.tsx`
- `src/admin/components/users/AdminUsersErrorState.tsx`
- `src/admin/components/users/AdminUsersSkeleton.tsx`
- `src/admin/components/users/AdminUserRoleBadges.tsx`
- `src/admin/components/users/AdminUserIdentityCell.tsx`
- `src/admin/components/users/AdminProfileCompletedBadge.tsx`
- `src/admin/hooks/useAdminUsersQueryParams.ts`
- `docs/admin-dashboard/phase-f2-users-list-ui.md`

Edited:

- `src/admin/lib/users.schema.ts` (strict page schema)
- `src/App.tsx` (route)
- `src/admin/components/AdminSidebar.tsx` (real links)
- `src/admin/components/AdminNavItem.tsx` (link vs. planned rendering)
- `docs/admin-dashboard/README.md`

## Platform-1.1 strict schema patch

`src/admin/lib/users.schema.ts` page object now uses:

```ts
const nonNegativeIntegerSchema = z.number().int().nonnegative();

const pageSchema = z.object({
  limit: nonNegativeIntegerSchema,
  offset: nonNegativeIntegerSchema,
  returned: nonNegativeIntegerSchema,
  total: nonNegativeIntegerSchema,
  hasMore: z.boolean(),
});
```

Row-level guarantees are unchanged: `userId` non-empty, invalid rows dropped,
unknown roles filtered, and no `avatar_path`, raw metadata, phone, bio, city,
country, or creative-content fields exist in the schema.

## Data source

- The page calls **only** `loadAdminUsers()`, which calls **only** the
  `admin_list_users` RPC.
- No component calls Supabase directly. No browser reads from `auth.users`,
  `public.user_roles`, or `public.profiles`. No `service_role`, no
  `admin_has_app_role`.

## Why TanStack Query

Users data is server state — fetched, cached, stale-able, refetchable. Query
gives caching, request dedupe, background refetch, and a retry policy out of the
box. The query key is `adminQueryKeys.users.list({ search, role,
profileCompleted, limit, offset })` with URL-normalized filters, so equivalent
views share a cache entry and refresh/back-forward reproduce the same request.
`placeholderData: (prev) => prev` keeps the previous page visible during a
background refetch to avoid skeleton flashes. Zustand is **not** used for this
server state.

## Why TanStack Table

The table needs a headless column/render model while keeping our premium custom
markup. It runs in manual mode (`manualPagination`, `manualSorting`,
`enableSorting: false`) because the RPC already paginates server-side — the table
never pretends to sort or paginate data the server controls. Server-backed
sorting is a future addition.

## URL query params

`/admin/users` reflects all filter/page state to the URL (shareable,
bookmarkable):

| Param | Meaning | Default |
|---|---|---|
| `q` | search (email/displayName) | none → `null` |
| `role` | `owner`/`admin`/`support`/`reviewer` | none → `null` |
| `profileCompleted` | `true` / `false` | none → `null` |
| `limit` | page size: 10 / 25 / 50 / 100 | `25` |
| `offset` | pagination offset | `0` |

Invalid params are normalized safely (unknown role → ignored, bad number →
default, offset clamped to `0..10000`).

## Search / filter / pagination behavior

- Search is debounced ~300ms (no new dependency) and searches email/displayName
  only. Empty search → `null`. Over 100 chars shows an inline validation message
  and is **not** committed to the query/RPC.
- Changing search, role, profile filter, or page size resets `offset` to `0`.
- Pagination uses the RPC's `limit/offset/returned/total/hasMore`. "Showing X–Y
  of Z" is shown; Previous disabled at `offset = 0`; Next disabled when
  `hasMore` is false or the next offset would exceed `10000`.

## Privacy boundaries

Displayed (owner/admin-only list, so email is allowed):

- display name, email, role badges, profile completed/incomplete, created date,
  last sign-in (or "Never"), and an Admin Console access indicator.

Intentionally **not** displayed: phone, bio, city, country, raw auth metadata,
provider tokens, `avatar_path`, storage object paths, project content, scene
prompts, notes/narration, and IP hashes. The avatar is an initials placeholder
derived from name/email — no uploaded avatar is rendered.

## Why no user actions yet

This phase establishes the read surface only. Grant/revoke, suspend/ban/delete,
password reset, impersonation, bulk actions, and the user detail page are
deliberately deferred until each has a secure, audited server-side producer.

## Why support/reviewer show as roles but are forbidden from the console

`support` and `reviewer` are real roles and appear as badges, but they do not
grant Admin Console access in the MVP — only `owner`/`admin` pass `AdminGuard`.
The "Console access" column makes this explicit (`No access (MVP)`).

## Manual QA checklist

1. Signed out → `/admin/users` redirects to `/login`; no users table flash.
2. Non-admin authenticated → forbidden; no users table flash.
3. support/reviewer (without owner/admin) → forbidden.
4. owner/admin → sees the Users page; data loads from the RPC.
5. Search: email/displayName only, debounced, 100-char max enforced (inline
   validation, not committed when too long).
6. Role filter: all/owner/admin/support/reviewer; invalid `role` param ignored.
7. Profile filter: all/completed/incomplete.
8. Pagination: previous/next/first work; page size works; URL params update.
9. Empty: filters with no results show the filtered empty state.
10. Error: missing RPC/migration shows the friendly unavailable state with retry.
11. Privacy: no avatar_path, raw metadata, phone/bio/location, or creative
    content in the DOM.
12. No actions: no grant/revoke, delete/suspend/ban.
13. `/app` still local-first and opens without sign-in.
14. `npm run build` passes.

## Recommended next phase

Phase F3 — User detail (read-only) drawer/page from the list, still RPC-backed
and action-free, OR Phase G — Roles management once a secure, audited grant/
revoke RPC and confirmation UX are designed.
