# 21 — Testing & QA Plan

The project has no automated test runner today (no test script in
[package.json](../../package.json)); RLS tests are manual
(`supabase/tests/rls-manual-checks.sql`). So the QA plan is: **manual checklists +
SQL attack simulations now**, with hooks for automated tests when infra is added.

## Access-control matrix tests

Run each as a real session of that role (bootstrap test users via SQL editor).

| Scenario | Expected |
|---|---|
| **owner** opens every admin route | all load; owner/admin grant options visible |
| **admin** opens every route | all load; owner/admin grant options **hidden**; support/reviewer grants work |
| **support** opens routes | read-only views load (per policy decision); **no** mutation controls anywhere |
| **reviewer** opens routes | same read scope as support; no mutations |
| **normal user** opens `/admin` (and deep links) | `AdminForbidden`, no admin data, no flicker of admin UI |
| **signed-out** opens `/admin/users/x` | redirected to `/login?redirect=/admin/users/x`; after login, lands there |
| **Supabase unconfigured** | redirected to `/login`; no fake admin data |

## Role management tests

- Owner grants admin → role appears + audit row written + visible in `/admin/audit`.
- New admin grants support → works + audited; cannot grant admin/owner (hidden + server-rejected if forced).
- **Cannot self-promote**: no UI path; direct RPC `grant_app_role(self,'owner')`
  as non-owner → exception.
- **Cannot remove last owner**: button disabled; direct `revoke_app_role` →
  "cannot remove the last owner".
- Demote self (with another owner present) → extra confirm; succeeds; audited.
- Duplicate grant → silent success (no error), role unchanged.

## Data-correctness tests

- Overview role counts match `SELECT role, count(*) FROM user_roles GROUP BY role`.
- Admin-actions counter matches `admin_audit_events` count for the window.
- Users list pagination (cursor): insert a new profile mid-paging → no duplicates/skips.
- Filters reflect to URL and restore on reload.
- Audit/security feeds order newest-first with stable paging.

## Honest-state tests

- Projects / Security / Abuse render labelled empty states, **no fabricated rows**.
- Future metric tiles show the "available after …" variant, not a `0` metric.
- Users list shows no email/last-login column until the Edge fn exists.

## Security tests (the important ones)

- **No service_role in bundle:** `grep -ri "service_role" dist/` → nothing; check
  network calls use only the anon key / approved Edge fns.
- **Direct-call bypass:** as a normal user, call `supabase.from('admin_audit_events').select()`
  and `supabase.from('user_roles').select()` for another user → RLS returns 0
  rows / denies.
- **Role enumeration:** confirm no frontend-callable function returns another
  user's roles without `is_admin()` (no resurrected `has_app_role(uid,role)`).
- **XSS:** audit `metadata` and user-supplied strings render as text/JSON (no
  `dangerouslySetInnerHTML`); paste `<img onerror>`-style content into a profile
  field and confirm it renders inert in the admin view.
- **RLS suite:** run `supabase/tests/rls-manual-checks.sql` attack blocks with two
  real users — all must ERROR / 0 rows.
- **Edge fns (when built):** call without admin role → 403; signed out → 401; body
  spoofing the caller id → ignored; every privileged effect writes one audit row.

## Non-regression tests (must not break existing app)

- `/app` loads, projects persist (IndexedDB `framefore-state` v9), guest +
  signed-in flows unchanged.
- `/profile` loads and saves; avatar upload/remove works.
- `AccountMenu` unchanged (and reconcile with Codex's cleanup once merged).
- Local→nothing: admin code never writes to `useStore` / local project data.
- `npm run build` passes (tsc + vite).

## Responsive / a11y tests

- Mobile: sidebar drawer, tables → stacked cards, dialogs full-width.
- Keyboard: tab order, `Esc` closes dialogs, focus trap + restore.
- Contrast AA; role meaning not color-only.

## Future automated tests (when infra added)

- Unit: `roles.ts` helpers, `friendlyAdminError`, cursor builders.
- Integration: two-user RLS tests in CI (the SECURITY_REVIEW backlog item).
- E2E (Playwright): the access-control matrix + role grant happy path.

## Definition of done (MVP)

All access-control, role-management, data-correctness, honest-state, security, and
non-regression checks pass; build is green; no service-role key in any artifact.
