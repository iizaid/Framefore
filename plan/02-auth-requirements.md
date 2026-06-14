# 02 — Auth Requirements

Functional requirements for Framefore authentication. Behavior must build on the
existing [useAuthStore](../src/store/useAuthStore.ts) and remain a no-op when
Supabase is not configured.

## R1 — Email/password signup
- Form: email + password (+ confirm password, + optional full name).
- Calls `useAuthStore.signUp(email, password)` (already implemented).
- Password rules surfaced client-side; Supabase enforces server-side
  (min length set in Supabase dashboard, recommend ≥ 8).
- On success with email confirmation **on** → `needsConfirmation: true` →
  show "Check your email" state, do **not** redirect to `/app` yet.
- On success with confirmation **off** → session exists → redirect to `/app`.

## R2 — Email/password login
- Form: email + password.
- Calls `signIn(email, password)`.
- On success → redirect to intended destination (default `/app`).
- On failure → inline error from `error.message` (already surfaced in store).

## R3 — Logout
- Calls `signOut()` (clears `user`/`session`).
- After logout, user lands on `/` (landing) or `/login`.
- **Local projects remain intact** — logout never clears IndexedDB.

## R4 — Session restore
- `init()` runs on module load, calls `supabase.auth.getSession()` and subscribes
  to `onAuthStateChange`. Already implemented.
- App must wait for `initialized === true` before deciding redirects, to avoid a
  flash of the login page for an already-authenticated user.
- Token refresh is automatic (supabase-js default) — no app code needed.

## R5 — Protected `/app` route (FUTURE — not this phase)
- **Today `/app` is intentionally open.** Per `App.tsx`, route protection is
  Phase 4.3, after migration is ready.
- When introduced, a `<ProtectedRoute>` checks `initialized && user`. If not
  signed in: either allow local-only mode (preferred) or redirect to `/login`.
- **Decision required** (see [20](20-open-questions-and-decisions.md)): is `/app`
  ever fully gated, or always usable in local-only mode? Recommendation:
  **local-only mode stays allowed**; cloud features require sign-in.

## R6 — Redirect behavior
- Preserve the in-app hash (`#/project/<id>`) across auth redirects. Use a
  `redirectTo` query param on `/login`, e.g. `/login?next=/app%23/project/abc`.
- OAuth `redirectTo` is `${window.location.origin}/app` (already set in store).
  When email-confirmation redirects are added, point them at a dedicated
  `/auth/callback` route (see [04](04-auth-flows-login-signup-logout.md)).

## R7 — Already-logged-in behavior
- Visiting `/login` or `/signup` while authenticated → redirect to `/app`.
- Must wait for `initialized` before applying this rule.

## R8 — Missing Supabase env behavior
- `isSupabaseConfigured === false` → auth UI shows a friendly "Auth not
  configured / no sign-in needed" state (matches today's copy).
- All store actions already return `{ error: "Auth is not configured…" }` when
  `supabase` is null — surface that, never crash.
- The app **must remain fully usable** in this state (local-first).

## R9 — Error handling
- Store sets `error` and returns `{ error }`. UI shows inline, dismissible.
- Map common Supabase errors to friendly copy:
  | Supabase message | Friendly copy |
  |---|---|
  | `Invalid login credentials` | "Email or password is incorrect." |
  | `Email not confirmed` | "Please confirm your email first — check your inbox." |
  | `User already registered` | "An account with this email already exists. Log in instead." |
  | rate-limit errors | "Too many attempts. Try again in a minute." |
- `clearError()` on field edit / route change.

## R10 — Loading states
- `loading` in store toggles around `signIn`/`signUp`/`signOut`.
- Buttons disable + spinner while `loading`. Form inputs disabled during submit.
- Distinguish `initialized` (first session check) from `loading` (an action).

## R11 — Mobile auth behavior
- Auth pages are responsive (`AuthShell` uses `max-w-sm`, full-height).
- The planned split-screen (`AuthLayout` + `AuthVideoPanel`) collapses the video
  panel on small screens; form stays single-column.
- Touch targets ≥ 44px; OAuth buttons already `h-11`.

## R12 — Existing local project safety
- Auth must never read, mutate, or clear the `framefore-state` /
  `framefore-images` IndexedDB stores.
- Signing in does **not** auto-upload or auto-overwrite local projects;
  migration is a separate, explicit, opt-in flow ([08](08-local-to-cloud-migration-plan.md)).

## Non-functional requirements
- **A11y:** labeled inputs, `aria-invalid` on errors, focus management on error,
  visible focus rings.
- **Security:** tokens handled by supabase-js (localStorage by default; consider
  PKCE flow). No secrets in client. See [14](14-security-threat-model.md).
- **Perf:** auth init is a single network call; don't block first paint of the
  landing page on it.

## Acceptance summary
A user can sign up, confirm email, log in, refresh (stay logged in), and log out.
With no env configured, the app still works fully offline and shows graceful
"auth not configured" copy. No local project is ever touched by auth.
