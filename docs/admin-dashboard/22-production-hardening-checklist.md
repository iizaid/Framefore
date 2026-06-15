# 22 — Production Hardening Checklist

Complete before the admin console (and especially any Edge-function action) goes
live. Builds on the pre-launch checklist in
[supabase/SECURITY_REVIEW.md](../../supabase/SECURITY_REVIEW.md).

## Supabase project settings

- [ ] Migrations `0001–0008` applied to the target project (confirm — overview
      notes they may be unapplied).
- [ ] Planned `0009+` (role RPC, user-overview fn, indexes) applied + tested.
- [ ] RLS enabled on **every** table; verify with the manual test suite.
- [ ] First `owner` bootstrapped via SQL editor; verified a normal user **cannot**
      `grant_app_role(self,'admin')`.
- [ ] Auth redirect URLs configured for the deployed origin (login, `/auth/callback`,
      `/reset-password`) — matches `useAuthStore` redirects.
- [ ] Authentication → Rate Limits set (sign-in/up/OTP/email).
- [ ] CAPTCHA / Turnstile enabled for signup + password reset.

## Network / platform

- [ ] App behind Cloudflare (or Vercel protections) for DDoS/bot mitigation.
- [ ] HTTPS-only; HSTS.
- [ ] Strict Content-Security-Policy on the admin app (limits XSS blast radius).

## Secrets & service role

- [ ] Service-role key absent from the repo and **all** `VITE_*` vars
      (`grep -ri service_role` clean; bundle scan clean).
- [ ] Service-role key + IP-hash salt set only as Edge-function secrets
      (`supabase secrets set`).
- [ ] `.env.local` is git-ignored / not bundled.
- [ ] **Verify no OAuth client-secret JSON files exist in `public/` or `dist/`
      before launch** (e.g. `ls public/client_secret* dist/client_secret*` → none).
      Codex's cleanup removed the earlier `public/client_secret_2_Framefore.json`;
      re-verify each build, since anything under `public/`/`dist/` is served
      publicly. OAuth client secrets belong only in server/Edge secrets.
- [ ] CI/CD never echoes secrets in logs.

## Identity & access

- [ ] MFA enabled on the Supabase **account/org** (protects the dashboard +
      service role).
- [ ] Admin/owner accounts use strong auth (and app-level MFA when available —
      `plan/13-mfa-2fa-security-plan.md`).
- [ ] Role list reviewed: only intended people hold owner/admin.

## Edge functions (if any shipped)

- [ ] Each verifies JWT → asserts `is_admin()`/`is_owner()` server-side.
- [ ] Each writes `admin_audit_events`.
- [ ] Inputs validated/bounded; errors sanitized.
- [ ] Rate-limited where appropriate (`rate_limit_events`).
- [ ] Function secrets scoped; no secret leakage in responses.

## Data lifecycle

- [ ] Automated backups / PITR enabled (paid plan) and a restore tested.
- [ ] Custom SMTP configured (reliable auth emails) — `docs/supabase-auth-setup.md`.
- [ ] Audit-log retention/archival policy decided + job scheduled
      ([10](10-security-events-and-audit-logs.md)).
- [ ] `security_events` / `rate_limit_events` retention sweep scheduled.
- [ ] Storage orphan-cleanup job scheduled (objects don't cascade) — report-only
      first ([12](12-storage-and-avatar-moderation.md)).

## Storage

- [ ] `avatars` and `reference-images` buckets confirmed **private**.
- [ ] SVG remains excluded from both buckets.
- [ ] All display uses short-TTL signed URLs; no public URLs.

## Application

- [ ] `AdminGuard` no-flicker verified across roles.
- [ ] No fake metrics/buttons anywhere (honest empties used).
- [ ] `/app` local-first behavior unchanged; `/profile` unchanged.
- [ ] `npm run build` green; type-check clean.
- [ ] Admin bundle lazy-loaded (non-admins don't download it).

## Manual admin acceptance test (sign-off)

- [ ] Run the full [21](21-testing-and-qa-plan.md) checklist on staging with real
      owner/admin/support/normal users — all pass.
- [ ] Two-user RLS attack simulations all ERROR / 0 rows.

## Rollback plan

- [ ] Admin is additive (new routes/files); rollback = revert the admin chunk +
      remove the nested `/admin` routes, restoring the placeholder. `/app` and
      `/profile` are unaffected.
- [ ] New migrations are additive/idempotent; a problematic view/RPC can be
      dropped without touching `0001–0008` or user data.
- [ ] Edge functions can be disabled/undeployed independently; the console
      degrades to its honest empty/unavailable states.
- [ ] Document the exact revert commit + the "disable admin" steps in the Runbook
      (`/admin/docs`).
