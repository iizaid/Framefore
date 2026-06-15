# 15 — RLS & Service-Role Security

The single most important document. The admin console adds **surface**, not a new
security boundary. The boundary is, and remains, Postgres RLS + the role
functions in [0006](../../supabase/migrations/0006_admin_roles.sql), backstopped
by composite FKs and CHECK constraints (the 3-layer model in
[SECURITY_REVIEW.md](../../supabase/SECURITY_REVIEW.md)).

## Core principles

1. **The frontend admin UI is NOT a security boundary.** Anyone can open dev
   tools, call the anon client directly, or craft requests. The UI hiding
   non-permitted actions is *cosmetic*. Security must hold even if the entire
   admin bundle is hostile.
2. **Every privileged read/write is authorized server-side** — by an RLS policy
   (for direct table access) or by an `is_admin()`/`is_owner()` check inside a
   `SECURITY DEFINER` function / Edge function. Never by "the client said so".
3. **The service-role key must never reach the browser.** It bypasses all RLS.
   It lives only in Edge function secrets / CI. Leaking it defeats every layer.
   Concretely: no `VITE_SERVICE_ROLE*`, no service key in `.env.local` that Vite
   bundles, no service key in committed files. The frontend uses only the anon
   key ([lib/supabase.ts](../../src/lib/supabase.ts)).

## What's safe directly from the (admin) browser

Because the policies already grant it:
- `user_roles` SELECT (`auth.uid()=user_id OR is_admin()`).
- `admin_audit_events` SELECT (`is_admin()`).
- `grant_app_role` / `revoke_app_role` RPC (self-authorizing functions).
- `get_current_user_roles()` (planned; self-only).
- `admin_list_user_overview()` (planned; `is_admin()`-checked).

## What must NOT be done from the browser (→ Edge fn)

Reading `auth.users`, suspend/ban/delete, another user's storage object, bulk
exports, retention/cleanup jobs, anything needing the service role. See
[13](13-admin-actions-and-edge-functions.md).

## Role-enumeration prevention (preserve it)

`0006` deliberately removed `has_app_role(uid, role)` because it let any user
probe arbitrary users' roles. The console must **not reintroduce** an
enumeration oracle:
- Use `get_current_user_roles()` (self) for the gate.
- Use `admin_list_user_overview()` / `admin_has_app_role()` (admin-checked,
  fail-closed) for inspecting others.
- Never add a frontend-callable function that returns another user's roles
  without an `is_admin()` gate.

## User-content privacy & cross-tenant safety

- RLS scopes every content read/write to `auth.uid()`; composite FKs make
  cross-tenant links unstorable even under the service role.
- `0006` adds **no** admin RLS over content — keep it that way. Admin content
  access (if ever) is a narrow, justified, audited Edge path only
  ([09](09-project-visibility-and-support-plan.md)).
- A second user on the same browser must never see the first user's admin data:
  reuse the `useProfileStore` reset-on-identity-change pattern for `useRoleStore`
  and any admin caches ([18](18-state-data-fetching-and-cache.md)).

## Audit every privileged mutation

- DB path: `grant/revoke_app_role` already write `admin_audit_events`.
- Edge path: every function writes an audit row (step 6 of the contract).
- The console never offers a privileged mutation that isn't audited.

## Token / session risks

- `supabase-js` manages JWTs; ensure HTTPS-only, short token lifetimes.
- Never log tokens, full request URLs (may carry tokens), or session objects —
  the migrations and security review repeat this; admin code must too.
- Admin sessions are just normal user sessions with a role — there's no separate,
  more-powerful admin token to steal, which is good (no elevated client creds).

## CSRF / XSS notes

- **CSRF:** Supabase uses bearer tokens in the `Authorization` header (not ambient
  cookies), so classic CSRF doesn't apply to the data layer. Edge functions
  authorize via the forwarded JWT, not cookies.
- **XSS is the real risk:** an XSS in the admin app runs with the admin's token.
  Mitigations: React's default escaping (don't use `dangerouslySetInnerHTML` on
  audit `metadata` / user-supplied strings — render as text/JSON), strict CSP,
  the existing SVG rejection (no inline SVG rendering), and never reflecting raw
  DB errors into the DOM.

## Secure error messages

Follow `friendlyDbError()` from [lib/profile.ts](../../src/lib/profile.ts): map
known codes to friendly copy, log raw errors only in DEV, never surface raw
Postgres/Storage internals (they leak schema/policy details). Edge functions
return sanitized messages too.

## No arbitrary SQL console

The app must never include a SQL runner, a generic "query" box, or any endpoint
that executes client-supplied SQL. All access is via typed/parameterized Supabase
calls and the named functions above.

## Acceptance criteria

- A non-admin calling any admin RPC/table directly (bypassing the UI) is denied
  by RLS/function checks (verified with two real users).
- `grep -r service_role dist/` and the bundle find nothing.
- No admin path returns another user's roles/content without a server-side admin
  check.
- Audit rows exist for every privileged mutation performed during QA.
