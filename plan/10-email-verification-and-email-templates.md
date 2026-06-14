# 10 — Email Verification & Automatic Emails

What Supabase sends automatically, the flows, and Framefore-branded template copy.

## Emails Supabase can send (Auth → Email Templates)
| Template | Trigger | App involvement |
|---|---|---|
| **Confirm signup** | `signUp` with confirmation ON | Show "check your email"; handle callback |
| **Magic Link** | `signInWithOtp` (if enabled) | Optional, see below |
| **Reset password** | `resetPasswordForEmail` | Provide request + update screens |
| **Change email** | `updateUser({ email })` | Confirm on old + new address |
| **Reauthentication** | sensitive actions / MFA | Future |
| **Invite** | admin invite | Not used in MVP |

All are sent by Supabase. The app only triggers them and handles redirect links.

## Email confirmation flow
1. `signUp(email, password)`; store returns `needsConfirmation = !data.session`.
2. UI shows confirm-email state with the address + "Resend" + "Change email".
3. User clicks the email link → lands on the redirect URL (recommend
   `${origin}/auth/callback`).
4. `/auth/callback` finalizes the session (supabase-js handles the token, or
   `exchangeCodeForSession` for PKCE) → redirect to `/app`.

### Redirect URL config
- The confirm/magic/reset links use the `redirectTo` you pass (must be on the
  allow-list, doc 03). Use a dedicated `/auth/callback` route rather than `/app`
  so token handling is isolated from workspace mount logic (which has the hash
  router).

## Password reset flow
- Request: `supabase.auth.resetPasswordForEmail(email, { redirectTo: ${origin}/auth/update-password })`.
- Email link → `/auth/update-password` → `supabase.auth.updateUser({ password })`.
- Expired/invalid link → show "This link expired — request a new one."

## Change-email confirmation
- `updateUser({ email })` → Supabase emails BOTH old and new addresses
  (secure-email-change default). User must confirm to finalize.

## Magic link (optional, not MVP)
- `signInWithOtp({ email })` sends a passwordless login link.
- Could be a nice low-friction option later; for MVP keep password-based to match
  existing store actions. Decision: [20](20-open-questions-and-decisions.md).

## Welcome email (optional)
- Not built-in for password signups beyond confirmation. A branded welcome email
  would need an Edge Function on `auth.users` insert (doc 16) or a 3rd-party
  (Resend/Loops). **Future, not MVP.**

## Resend confirmation
- `supabase.auth.resend({ type: 'signup', email })`. Add store action
  `resendConfirmation(email)`; rate-limit in UI (e.g. 30–60s cooldown) to match
  Supabase's own limits.

## Expired link behavior
- Confirmation/reset links expire (default ~24h / configurable). On an expired
  link the callback errors → show a friendly screen with a "Resend" CTA.

## Framefore template copy (paste into Supabase templates)

### Confirm signup
```
Subject: Confirm your Framefore account

Welcome to Framefore — the workspace for planning AI videos before you generate them.

Confirm your email to start building:
{{ .ConfirmationURL }}

If you didn't create this account, you can ignore this email.
— The Framefore team
```

### Reset password
```
Subject: Reset your Framefore password

We received a request to reset your password.
Choose a new one here (link expires soon):
{{ .ConfirmationURL }}

Didn't request this? Your account is safe — just ignore this email.
— The Framefore team
```

### Magic link (if enabled)
```
Subject: Your Framefore sign-in link

Click to sign in to Framefore:
{{ .ConfirmationURL }}

This link expires shortly and can only be used once.
```

### Change email
```
Subject: Confirm your new Framefore email

Confirm this address to finish updating your Framefore login:
{{ .ConfirmationURL }}

If you didn't request this change, contact support immediately.
```

## Security notes about email links
- Links carry a one-time token; treat the whole URL as a secret in logs.
- Always land tokens on a dedicated `/auth/*` route, exchange immediately, then
  `history.replaceState` to strip the token from the URL bar.
- Keep link lifetime short; rely on Supabase rate limits + app cooldowns to slow
  abuse (doc 14).

## What needs Edge Functions later (doc 16)
- Branded welcome emails / drip sequences.
- Email change audit logging.
- Anything beyond the built-in auth templates.

## Store actions to add
```ts
resendConfirmation(email)
requestPasswordReset(email)
updatePassword(newPassword)
updateEmail(newEmail)
```
