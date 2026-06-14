# Framefore — Security Review (pre-launch)

Scope: the Supabase schema, RLS, admin model, storage, and rate-limit
architecture in `supabase/migrations/0001–0007`. Reviewed as if for a real SaaS
launch. **No claim of "100% secure" is made** — residual operational risks are
listed honestly below.

## Threat model assumptions

A malicious *authenticated* user may try to: forge `user_id`, guess UUIDs, link
their records to another user's project/scene, rewrite foreign keys after insert,
escalate to admin, read/write another user's data, abuse storage paths, send huge
payloads, bypass frontend validation, and abuse auth/rate limits.

## What is enforced

### Tenant isolation (3 layers)
- **Composite FKs (0002)** — `scenes(id, project_id, user_id)` and
  `projects(id, user_id)` as FK targets make cross-tenant links *unstorable* even
  under the service role. Covers: forged `project_id`, post-insert FK rewrites,
  scene-link/asset pointing at another tenant.
- **RLS (0003)** — per-command policies scoped to `auth.uid()`. UPDATE uses
  `WITH CHECK` (incl. parent-project / endpoint-scene ownership) so a row can't be
  rewritten across tenants. SELECT/DELETE gate on `user_id`.
- **CHECK constraints (0002/0005/0006/0007)** — bound lengths, ranges, enum-ish
  values (`prompt_dir`), and force JSONB bags to be objects.

### Privilege escalation
- `user_roles` has **no client write policy**; the only write path is
  `grant_app_role()`/`revoke_app_role()`, which require the caller to already be
  owner/admin. First owner is bootstrapped manually via the service role. Roles are
  not on `profiles`, so profile edits can't escalate. See `ADMIN_MODEL.md`.

### Role privacy (no enumeration)
- Role helper functions are **self-only unless admin**: `has_current_user_role()`,
  `is_admin()`, `is_owner()` read only `auth.uid()` (no user-supplied UUID to
  forge). The arbitrary-uid `admin_has_app_role()` **fails closed** (returns
  `false`) for non-admins. The old `has_app_role(uid, role)`, which let any
  authenticated user probe another user's roles, was removed.

### SQL-function safety
- All functions (`set_updated_at`, `handle_new_user`, `has_current_user_role`,
  `admin_has_app_role`, `is_admin`, `is_owner`, `grant_app_role`,
  `revoke_app_role`) set an explicit `search_path` and use **no dynamic SQL** (no
  `EXECUTE`/`format`), so SQL injection via these functions is not possible.
  `SECURITY DEFINER` is used only where required; EXECUTE is revoked from
  `anon`/`public`.
- Client queries must always use the typed/parameterized Supabase client — never
  build SQL from user input.
- `handle_new_user()` **sanitizes OAuth provider metadata** before insert
  (trim, `''`→NULL, cap `full_name` to 160 / `avatar_url` to 2048, drop any
  non-`http(s)` avatar). A hostile or malformed provider payload therefore cannot
  fail signup by tripping the `profiles` constraints — yet those constraints stay
  strict and still reject a bad *manual* profile write (defense in depth).

### Storage (0004)
- Private bucket, 10 MB cap, image MIME allow-list, **SVG excluded** (script
  vector). RLS gates on `segment[1] = auth.uid()`; both write paths that set a
  destination — INSERT and UPDATE (rename/move) — additionally require
  `segment[2]` (project_id) to be a project the caller owns, so an object can't be
  placed or moved into another user's folder or a foreign project. SELECT/DELETE
  stay segment[1]-only to preserve orphan cleanup. Serve via short-lived signed
  URLs only.

### Audit
- `security_events` (per-user) and `admin_audit_events` (admin-read) are
  append-only from the client. `grant/revoke_app_role` write audit rows.

## Residual risks (NOT solved by SQL — operational)

1. **Auth brute force / spam** — must be configured in the Supabase dashboard
   (auth rate limits) + CAPTCHA/Turnstile + Cloudflare. SQL cannot throttle auth.
   See `RATE_LIMITING.md`.
2. **Storage residual risks** — RLS validates path segments [1]/[2] but cannot
   atomically verify segment [3] (scene_id) ownership or enforce the project↔scene
   relationship per object. Route privileged/bulk object ops through an Edge
   Function (service role) with audit logging. Storage objects do **not** cascade
   on project delete — an explicit cleanup job is required (orphan risk otherwise).
3. **Service-role key** — bypasses all RLS. Must live only in Edge Functions / CI
   secrets, never in any `VITE_*` var or the repo. Leaking it defeats every layer.
4. **JWT / session theft** — handled by `supabase-js`; ensure HTTPS-only, short
   token lifetimes, and don't log tokens or full URLs.
5. **DoS via large but valid payloads** — CHECK constraints bound per-row size,
   but high request volume needs network-level (Cloudflare) and Edge-Function
   limits.
6. **No automated RLS test suite yet** — `tests/rls-manual-checks.sql` is manual.
   Add CI integration tests with two real users before scaling.
7. **MFA/2FA** — not enforced here; configure in Supabase Auth (see
   `plan/13-mfa-2fa-security-plan.md`).
8. **Backups / restore / account deletion** — see `DATA_LIFECYCLE` notes in
   `README.md`; destructive account-deletion functions are intentionally not
   implemented yet.

## Pre-launch checklist

- [ ] Apply `0001 → 0007` in a **staging** project; run `tests/rls-manual-checks.sql`.
- [ ] Run every ATTACK SIMULATION block with two real users — all must ERROR / 0 rows.
- [ ] Confirm `reference-images` bucket is **private**.
- [ ] Bootstrap the first `owner` via SQL editor; verify a normal user cannot
      `grant_app_role(self,'admin')`.
- [ ] Configure Auth rate limits + CAPTCHA; put app behind Cloudflare.
- [ ] Confirm service-role key is absent from the repo and all `VITE_*` vars.
- [ ] Set up Storage orphan-cleanup + audit-log/rate-limit retention jobs.
- [ ] Verify automated backups (PITR) are enabled on the Supabase project.
