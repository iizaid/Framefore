# Auth Access Gate (Phase Auth-1 + Auth-1.1)

Status: implemented. This phase hardens the product auth flow before further
Admin Dashboard work. `/app` is no longer public guest-access — it now requires
a signed-in, email-verified account. The admin console gains a visible entry
point for owner/admin users (UX only; `AdminGuard` remains the real boundary).

Auth-1.1 is also implemented: stale footer copy was corrected, OAuth preserves a
safe intended route through the external provider redirect, `/verify-email` can
resend confirmation when only a pending signup email is known, and the mobile
landing drawer now shows the Admin Console link for owner/admin users only.

## What changed

- **`/app` is gated** by a new `AppAccessGuard` (`src/components/auth/AppAccessGuard.tsx`).
  The workspace renders only when auth has initialized, a user exists, and the
  email is verified. Signed-out → `/login`; signed-in-but-unverified →
  `/verify-email`. The attempted destination is preserved in router state
  (`{ from }`) and restored after authentication.
- **Email verification is centralized** in `src/lib/authAccess.ts`
  (`isEmailVerified`, `getPostAuthRedirectTarget`, `buildFromState`,
  `isSafeInternalPath`). Verification trusts only Supabase's server-issued
  `user.email_confirmed_at` / `confirmed_at` — never localStorage, profile
  fields, or provider tokens.
- **New `/verify-email` page** (`src/pages/VerifyEmailPage.tsx`): shows the
  pending email, resends the confirmation (`resendConfirmation`), and offers
  "I verified my email — continue", which refreshes the session
  (`useAuthStore.reloadUser`) and only proceeds to `/app` if truly verified.
- **Auth callback** (`/auth/callback`) now forwards based on verification:
  verified → the saved safe intended route or `/app`, unverified →
  `/verify-email` with the intended route preserved in router state. OAuth users
  with a confirmed email pass straight through.
- **Login/Signup** route by verification. Signup that needs confirmation goes to
  `/verify-email`; a session returned immediately still respects
  `isEmailVerified`.
- **Landing CTAs** that previously pointed signed-out users at `/app` now use an
  auth-aware target via `useWorkspaceCta()`:
  signed-out → `/signup`, signed-in-unverified → `/verify-email`,
  signed-in-verified → `/app`. Updated in `LandingNav` (desktop + mobile),
  `HeroSection`, `PricingSection` (Free tier), and `Footer`.
- **Admin Console entry** added to `AccountMenu` — visible only when the role
  store is initialized and `canAccessAdmin` is true.
- **Mobile Admin Console entry** added to the landing drawer with the same role
  store condition: `initialized && canAccessAdmin`.
- **Footer FAQ copy** now says an account is required to open the workspace,
  projects remain local-first after sign-in, and cloud sync is not implemented.

## `/app` is now a verified-account workspace

`AppAccessGuard` is the single gate. Its order (mirrors `AdminGuard`):

1. Auth not initialized → compact loading (no workspace).
2. Supabase not configured → friendly "unavailable" state (no workspace).
3. Signed out → `<Navigate to="/login" state={{ from }} />`.
4. Signed in, unverified → `<Navigate to="/verify-email" state={{ from }} />`.
5. Signed in, verified → render the workspace.

No-flicker contract: every "not allowed yet" branch returns before children, so
the workspace never flashes for signed-out or unverified visitors.

## Admin Console link is UX, not security

The `AccountMenu` "Admin console" link only renders when
`useAdminRoleStore` reports `initialized && canAccessAdmin`. Hiding the link is
not a security control: `/admin` and `/admin/users` remain wrapped in
`AdminGuard`, which performs the real owner/admin role check. A non-admin who
types `/admin` is still forbidden. support/reviewer do not pass `AdminGuard` in
the MVP.

## Email verification flow

- **Email/password signup** → Supabase sends a confirmation email
  (`emailRedirectTo = /auth/callback`). The user lands on `/verify-email`.
- Clicking the email link returns through `/auth/callback`; if it establishes a
  confirmed session, the user is forwarded to `/app`. If the flow does not
  create a session, the user signs in normally — now verified.
- "I verified my email — continue" refreshes the session so the new JWT carries
  `email_confirmed_at`, then re-checks before entering `/app`.
- If `/verify-email` receives a pending signup email in router state and the
  user is signed out, it still allows "Resend confirmation email" via
  `resendConfirmation(email)`. The continue button remains available only for a
  signed-in session.
- Verification is never faked client-side.

## OAuth redirect intent

OAuth leaves the React app, so React Router state can be lost. Before starting
Google/GitHub OAuth, `OAuthButtons` stores one safe internal intended route in
`sessionStorage`. `/auth/callback` consumes that value after Supabase finishes
the session exchange.

Safety rules:

- only internal paths beginning with `/` are accepted;
- protocol-relative and backslash forms are rejected;
- auth routes are rejected (`/login`, `/signup`, `/verify-email`,
  `/auth/callback`, `/reset-password`);
- external URLs are never stored;
- the value is removed after callback consumption;
- fallback is `/app`.

## Supabase dashboard — manual operational requirements

Verify these in the Supabase project (they are configuration, not code):

- **Email confirmation enabled** (Authentication → Providers → Email →
  "Confirm email") if the product requires verified email for `/app`. With it
  disabled, signups auto-confirm and pass the gate immediately.
- **Redirect URLs** (Authentication → URL Configuration) must include the
  app origin's `/auth/callback` (and the site URL). Without it, confirmation /
  OAuth links won't return cleanly.
- OAuth providers (Google/GitHub) configured as before; providers that return a
  confirmed email satisfy the gate.

## Guest / local projects are preserved

This phase does **not** touch local-first data:

- No guest/local projects are deleted.
- No automatic guest → account migration.
- The explicit "import local projects" banner after sign-in still works.
- A signed-out user with local guest projects simply cannot open `/app` until
  they sign in; their data remains in IndexedDB untouched.

After access is granted, `/app` is still fully local-first (IndexedDB,
account-scoped by `ownerUserId`). **No cloud sync is implemented.**

## QA checklist

1. Signed-out landing "Start planning" → `/signup` (not `/app`).
2. Signed-out manual `/app` → redirect to `/login`; no workspace flash.
3. New email/password signup → `/verify-email`; cannot open `/app` before verifying.
4. Verified email link → returns via `/auth/callback`; verified user enters `/app`.
5. Unverified signed-in user opens `/app` → redirect to `/verify-email`.
6. Resend confirmation works from `/verify-email`.
7. Signed-out `/verify-email` with a pending email can resend confirmation and
   says "After confirming your email, sign in to continue."
8. OAuth started from `/admin` or `/admin/users` returns to the saved safe route
   after callback for verified owner/admin users.
9. OAuth with no safe route falls back to `/app`.
10. Normal signed-in user sees "Open app"; no "Admin console".
11. Owner/admin sees "Admin console" on desktop account menu and mobile drawer;
    `/admin` and `/admin/users` work.
12. Non-admin manual `/admin` → forbidden by `AdminGuard`.
13. support/reviewer (without owner/admin) → forbidden in MVP.
14. Guest local projects not deleted; explicit import after sign-in still works.
15. `/app` remains local-first after access; no cloud sync.
16. `npm run build` passes.
