# 04 — Auth Flows: Login / Signup / Logout

Concrete user flows mapped to the existing [useAuthStore](../src/store/useAuthStore.ts)
actions. Redirect target defaults to `/app`; preserve any `?next=` param.

## Signup — email confirmation ON
```
User → /signup → fill email+password → submit
  → signUp(email, password)
  → data.session === null  ⇒ needsConfirmation = true
  → UI: "Check your email to confirm your account" (stay on page, offer Resend)
  → User clicks email link → /auth/callback → exchange code → session set
  → onAuthStateChange fires → redirect to /app
```

## Signup — email confirmation OFF (dev / chosen mode)
```
submit → signUp() → data.session present ⇒ needsConfirmation = false
  → immediately authenticated → redirect to /app
```

## Login
```
User → /login → email+password → submit
  → signIn(email, password)
  → error?  → inline message (mapped per doc 02 R9)
  → success → onAuthStateChange sets session → redirect to ?next || /app
```

## Logout
```
User clicks "Log out" (in /app header or account menu)
  → signOut() → user/session cleared
  → redirect to / (landing)
  → IndexedDB untouched; local projects still present
```

## OAuth login (Google / GitHub)
```
User clicks "Continue with Google/GitHub"
  → signInWithGoogle()/signInWithGitHub()
  → browser navigates to provider consent
  → provider → Supabase /auth/v1/callback → redirectTo (${origin}/app)
  → app loads /app, init()/onAuthStateChange already have the session
```
Detail + edge cases (duplicate email, profile creation) in [11](11-oauth-google-github-plan.md).

### OAuth callback behavior
- Current `redirectTo` is `${origin}/app`; supabase-js detects the auth fragment
  on load and stores the session.
- If we adopt the PKCE/`?code=` flow, add an `/auth/callback` route that calls
  `supabase.auth.exchangeCodeForSession(window.location.href)` then redirects.

## Password reset flow (to implement)
```
/login → "Forgot password?" → /reset-password (request)
  → supabase.auth.resetPasswordForEmail(email, { redirectTo: ${origin}/auth/update-password })
  → email link → /auth/update-password
  → supabase.auth.updateUser({ password: newPassword })
  → success → redirect to /login (or /app if session active)
```
New store actions needed: `requestPasswordReset(email)`, `updatePassword(pw)`.

## Change password (signed-in)
```
Account settings → enter new password (optionally re-auth)
  → supabase.auth.updateUser({ password })
  → toast success
```

## Change email (signed-in)
```
Account settings → new email → supabase.auth.updateUser({ email })
  → confirmation sent to BOTH old and new (Supabase default) → see doc 10
```

## Session expiration behavior
- supabase-js auto-refreshes access tokens using the refresh token.
- If refresh fails (revoked/expired) → `onAuthStateChange` emits `SIGNED_OUT` →
  app clears `user`, shows "session expired, please sign in again", routes to
  `/login?next=<current>`.

## Error states (UI copy)
| State | Message |
|---|---|
| Wrong credentials | "Email or password is incorrect." |
| Unconfirmed email | "Confirm your email first — check your inbox. Resend?" |
| Already registered | "Account exists. Log in instead." |
| Network error | "Couldn't reach the server. Check your connection." |
| Rate limited | "Too many attempts. Wait a minute and retry." |
| Not configured | "Sign-in isn't set up yet — you can still use Framefore locally." |

## Redirect path summary
| From | Condition | To |
|---|---|---|
| `/login`, `/signup` | already authenticated | `/app` |
| `/login` success | `?next` present | `next`, else `/app` |
| signup (confirm ON) | success | stay, show check-email |
| email link | valid | `/auth/callback` → `/app` |
| logout | — | `/` |
| session expired | — | `/login?next=<current>` |

## New store actions required for full flows
```ts
requestPasswordReset(email): Promise<{ error: string | null }>
updatePassword(newPassword): Promise<{ error: string | null }>
updateEmail(newEmail): Promise<{ error: string | null }>
resendConfirmation(email): Promise<{ error: string | null }>
```
(Existing: `init, signIn, signUp, signOut, signInWithGoogle, signInWithGitHub,
clearError`.)
