# 11 — OAuth (Google & GitHub) Plan

Store actions already exist: `signInWithGoogle`, `signInWithGitHub` in
[useAuthStore](../src/store/useAuthStore.ts), both with
`redirectTo: ${window.location.origin}/app`. This doc covers the rest.

## Provider setup (recap of doc 03)
- Google Cloud OAuth client + GitHub OAuth app, each with callback
  `https://<project-ref>.supabase.co/auth/v1/callback`.
- Enable + paste Client ID/Secret in Supabase → Auth → Providers.

## Flow
```
Click "Continue with Google/GitHub"
  → signInWithOAuth({ provider, options:{ redirectTo } })
  → redirect to provider consent
  → provider → Supabase callback → app redirectTo (${origin}/app)
  → supabase-js parses session on load → onAuthStateChange → authenticated
```

## Redirect URLs
- Every origin used must be in Supabase's redirect allow-list (doc 03): local,
  prod, preview deploys.
- Recommend switching the OAuth `redirectTo` to `${origin}/auth/callback`
  (consistent with email flows) instead of `/app`, so token handling is isolated
  from the workspace's hash router. Then `/auth/callback` → `/app`.

## Account creation from OAuth
- First OAuth sign-in creates an `auth.users` row automatically.
- The existing `handle_new_user()` trigger (doc 03 / setup doc) inserts a
  `profiles` row, pulling `full_name`/`avatar_url` from
  `raw_user_meta_data` (Google/GitHub provide these).

## Profile creation / enrichment after OAuth
- Map provider metadata → `profiles`:
  | Provider field | profiles column |
  |---|---|
  | `name` / `full_name` | `full_name` |
  | `avatar_url` / `picture` | `avatar_url` |
- If the trigger ran before metadata was available, do a one-time
  `upsert profiles` on first authenticated load to backfill name/avatar.

## Duplicate email handling
- Supabase setting **"Link identities with same email"** governs whether a
  Google login and a GitHub login (or email/password) with the same address map
  to one user.
  - **Recommendation (MVP): enable automatic linking by verified email**, so a
    user who signed up with email/password and later clicks "Continue with
    Google" (same verified address) lands on the same account.
  - Caveat: only link on **verified** emails to avoid account takeover via an
    unverified provider email. Review in [14](14-security-threat-model.md).
- If linking is OFF, a same-email OAuth attempt can error ("identity already
  exists"); surface "This email is already registered — sign in with your
  password or link the provider in settings."

## Linking email/password ⇄ OAuth (account settings, future)
- Signed-in user can add a provider via `supabase.auth.linkIdentity({ provider })`.
- Unlink via `supabase.auth.unlinkIdentity(identity)` (keep at least one login
  method). This is a future account-settings feature, not MVP.

## Avatar / name import
- On profile creation, store `avatar_url`; the app can show it in the header/account
  menu. Re-fetch on each OAuth login to keep it fresh (optional).

## Security risks
| Risk | Mitigation |
|---|---|
| Account takeover via unverified provider email auto-link | Only auto-link verified emails |
| Open redirect via crafted `redirectTo` | Strict allow-list; never echo arbitrary redirect |
| CSRF on callback | Supabase state param + PKCE |
| Leaked client secret | Secret lives only in Supabase, never in frontend |
| Phishing consent screen lookalikes | Use official provider config; correct app name/logo |

## Failure states & UI
| State | UI |
|---|---|
| User cancels consent | Return to `/login`, no error toast (silent) or "Sign-in cancelled." |
| Provider error / misconfig | "Couldn't sign in with Google. Try again or use email." |
| Email already registered (linking off) | Guidance to sign in with existing method |
| Network failure mid-redirect | Land on `/login` with retry |

## Button behavior
- Current `ProviderButtons` are disabled placeholders. When wiring:
  - Enable buttons, attach `onClick={signInWithGoogle/GitHub}`.
  - Disable + spinner during redirect kickoff.
  - Hide entirely (or show "not configured") when `isSupabaseConfigured` is false.

## Acceptance criteria
- Google and GitHub sign-in each create a user + profile with name/avatar.
- Same verified email via two providers resolves to one account (if linking on).
- Cancelling consent returns cleanly to `/login`.
- Works on prod + preview origins (allow-list correct).
