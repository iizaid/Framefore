# Profile & Security — Implemented and Next Steps

This document records what shipped in **Phase 4.4 (Production Profile Page)** and
what is intentionally deferred to a later, dedicated security phase. It exists so
no one accidentally ships a fake/placeholder security control.

## What shipped in Phase 4.4

- **Migration `0008_profile_account_fields_and_avatars.sql`** — adds editable
  profile fields and the private `avatars` Storage bucket. Must be run manually
  in the Supabase SQL Editor (it is additive and safe on a live DB).
- **`src/lib/profile.ts`** — Supabase-only data layer: load/update profile,
  upload/remove avatar, resolve display URL. Client-side validation before every
  write; friendly error mapping; never uses the service role.
- **`src/store/useProfileStore.ts`** — profile/avatar state, resets on sign-out.
- **`src/pages/ProfilePage.tsx`** (`/profile`) — production account settings page:
  profile, contact, and security sections. Redirects unauthenticated users to
  `/login`; shows a friendly message when Supabase is not configured.
- **`src/components/account/AvatarCropDialog.tsx`** — avatar editor with image
  selection, drag positioning, zoom, circular preview, reset, cancel, and
  processed WebP upload. The original source image is never uploaded.
- **Account menu** in the landing navbar and workspace header (avatar → Profile /
  Sign out). The "Log in" button is hidden when signed in.
- **Password reset** from the profile page reuses
  `useAuthStore.requestPasswordReset(email)` and the existing `/reset-password`
  route. No in-page direct password-change form was added (it would only be added
  if fully implemented and verified).

## Two-Factor Authentication (2FA) — NOT implemented yet

2FA is **deliberately not implemented** in this phase. There is **no 2FA UI
control** anywhere — the Profile page shows only a static, non-clickable note:

> "Two-factor authentication will be added in a dedicated security phase."

When 2FA is built in its own phase, use **Supabase MFA / TOTP**:

- Enroll: `supabase.auth.mfa.enroll({ factorType: 'totp' })` → render the returned
  QR code / secret for an authenticator app.
- Verify enrollment: `supabase.auth.mfa.challenge()` + `supabase.auth.mfa.verify()`.
- Enforce at sign-in by checking the Authenticator Assurance Level
  (`supabase.auth.mfa.getAuthenticatorAssuranceLevel()`); require `aal2` for
  sensitive actions.
- Store nothing secret in the client; Supabase manages factors server-side.
- Add recovery/backup codes and a "manage devices" view as part of that phase.

Do **not** add a 2FA toggle/button before the full enroll → challenge → verify →
enforce flow exists and is tested. A control that looks active but does nothing is
worse than no control.

## Phone number — profile field vs. verified phone

`profiles.phone_number` is a **free-text, optional contact field**. It is **not**
a verified phone and must never be treated as a second factor or as proof of
identity. A future "phone verification" feature (SMS OTP via
`supabase.auth.signInWithOtp` / phone enrollment) is a separate concern with its
own verified-state column — do not conflate the two. Keep the free-text field and
any future verified-phone state visually and structurally distinct.

## Other deferred items (for later phases)

- Cloud project sync and protecting `/app` behind auth — explicitly out of scope
  here; `/app` remains local-first and untouched.
- Account deletion / data export (GDPR) self-service flow.
- Email change with re-verification.
