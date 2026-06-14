# 03 — Supabase Configuration Plan

How the Supabase project itself is configured (dashboard + env). No automated
migrations run in this phase — SQL blocks here are reference for the implementer.

## Required env vars (frontend)

| Var | Purpose | Exposure |
|---|---|---|
| `VITE_SUPABASE_URL` | Project API URL | **Public** (shipped to browser) |
| `VITE_SUPABASE_ANON_KEY` | Anonymous public key | **Public** (RLS is the boundary) |

Already consumed in [src/lib/supabase.ts](../src/lib/supabase.ts). Vite only
exposes vars prefixed `VITE_`.

> **NEVER** put `SUPABASE_SERVICE_ROLE_KEY` in any `VITE_`-prefixed var or in
> client code. It bypasses RLS. It belongs only in Edge Functions / server
> environments. See [14](14-security-threat-model.md) and [17](17-environment-variables-and-deployment.md).

## Auth settings (Dashboard → Authentication → URL Configuration)

| Setting | Local dev | Production |
|---|---|---|
| **Site URL** | `http://localhost:5173` | `https://app.framefore.com` (placeholder) |
| **Redirect URLs** (allow-list) | `http://localhost:5173/**` | `https://app.framefore.com/**`, plus preview domains |

The redirect allow-list must include every origin that calls
`signInWithOAuth`/email links. `redirectTo` values not on the list are rejected.

Recommended explicit redirect entries:
- `…/app` (post-OAuth landing — current store value)
- `…/auth/callback` (future, for email confirmation / code exchange)

## Email confirmation (Authentication → Providers → Email)

- **Confirm email:** recommend **ON** for production (verifies ownership).
  The store already handles both modes via `needsConfirmation = !data.session`.
- For fast local testing, confirmation can be **OFF** in a dev project.
- Configure templates per [10](10-email-verification-and-email-templates.md).

## Password policy
- Minimum length ≥ 8 (Dashboard → Auth → Policies). Consider leaked-password
  protection (HaveIBeenPwned) if available on the plan.

## OAuth providers (Authentication → Providers)

### Google
1. Google Cloud Console → create OAuth 2.0 Client (Web application).
2. Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Copy Client ID + Secret into Supabase Google provider, enable.
4. Authorized JS origins: your app origins.

### GitHub
1. GitHub → Settings → Developer settings → OAuth Apps → New.
2. Authorization callback URL: `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Copy Client ID + Secret into Supabase GitHub provider, enable.

Both already have store actions (`signInWithGoogle`, `signInWithGitHub`). Full
flow in [11](11-oauth-google-github-plan.md).

## Phone auth (FUTURE — see [12](12-phone-number-linking-plan.md))
- Requires an SMS provider (Twilio/MessageBird/Vonage) configured in
  Authentication → Providers → Phone.
- MVP recommendation: **do not enable**. Phone is a future, optional account
  link, not a login method.

## MFA (FUTURE — see [13](13-mfa-2fa-security-plan.md))
- Supabase supports **TOTP** MFA via `supabase.auth.mfa.*`.
- Enable "Multi-Factor Authentication (TOTP)" in Auth settings when the feature
  ships. Not in MVP.

## Database / Storage
- Schema: [05](05-database-schema-plan.md). RLS: [06](06-row-level-security-rls-plan.md).
- Storage bucket `reference-images` (private): [15](15-storage-and-reference-images-plan.md).
- Existing [docs/supabase-auth-setup.md](../docs/supabase-auth-setup.md) already
  documents the `profiles` table + `handle_new_user` trigger — keep it as the
  canonical bootstrap and expand per doc 05.

## Local development config
- Two options:
  1. **Hosted dev project** (simplest): a separate Supabase project for dev with
     confirmation OFF; put keys in `.env.local` (gitignored via `*.local`).
  2. **Supabase CLI** (`supabase start`) for a fully local stack — optional,
     heavier. Not required for MVP.

## Production config
- Separate Supabase project (never share dev/prod).
- Confirmation ON, custom SMTP for branded emails (Auth → SMTP Settings).
- Env vars set in the host (Vercel/Cloudflare) — see [17](17-environment-variables-and-deployment.md).

## Deployment env (Vercel / Cloudflare Pages)
Set in project settings (Production + Preview scopes):
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
- Preview deploys need their origins added to Supabase redirect allow-list, or
  use a wildcard like `https://*.vercel.app/**` (review the security tradeoff in
  [14](14-security-threat-model.md)).

## Configuration checklist
- [ ] Site URL + redirect allow-list set for each environment
- [ ] Email confirmation decision applied (ON prod / OFF dev)
- [ ] Custom SMTP configured for prod
- [ ] Google + GitHub providers configured (when OAuth phase ships)
- [ ] `profiles` table + trigger created (doc 05)
- [ ] RLS enabled on every user table (doc 06)
- [ ] `reference-images` private bucket + policies (doc 15)
- [ ] Service-role key stored only server-side, never in `VITE_`
