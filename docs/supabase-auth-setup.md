# Supabase Auth Setup

## 1. Environment variables

Copy `.env.example` to `.env.local` in the project root and fill in:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these from: Supabase Dashboard → Project Settings → API.

The **anon key is public by design** — it's protected by Row Level Security, so it's
safe to ship in the frontend. **Never** add the `service_role` key to `.env.local`,
any `VITE_*` variable, or the repo; it bypasses RLS and belongs only on a trusted server.

When the env vars are missing the app degrades gracefully: the landing page and `/app`
still work, and `/login` / `/signup` show a friendly "authentication is not configured"
message with disabled buttons instead of crashing.

## 2. Database migrations (Phase 4.3)

Full SQL migrations are now in `supabase/migrations/`. Apply them in order via
the Supabase SQL Editor or Supabase CLI. See `supabase/README.md` for detailed
instructions.

| File | Creates |
|---|---|
| `0001_profiles_and_auth_helpers.sql` | `profiles`, `user_settings`, `handle_new_user()` trigger |
| `0002_framefore_core_tables.sql` | `projects`, `scenes`, `scene_links`, `canvas_notes`, `canvas_sections`, `canvas_links`, `scene_assets` |
| `0003_framefore_rls_policies.sql` | RLS enabled + all per-command policies |
| `0004_reference_images_storage.sql` | `reference-images` private Storage bucket + policies |
| `0005_security_events.sql` | Optional audit log table |

**These migrations are not yet wired to the app** — the frontend is still
fully local-first. No local project data is read from or written to Supabase yet.
The next phase (4.4) will create the TypeScript cloud repository layer.

## 3. Redirect URLs

Framefore sends OAuth, signup-confirmation, and password-reset links back to a single
callback route: **`/auth/callback`**. Register these in Supabase Dashboard →
Authentication → URL Configuration:

| Setting | Value |
| --- | --- |
| Site URL (local dev) | `http://localhost:5173` |
| Redirect URL — OAuth & confirmation (local) | `http://localhost:5173/auth/callback` |
| Redirect URL — password reset (local) | `http://localhost:5173/reset-password` |
| Redirect URL — OAuth & confirmation (prod) | `https://YOUR_DOMAIN.com/auth/callback` |
| Redirect URL — password reset (prod) | `https://YOUR_DOMAIN.com/reset-password` |

The app builds these URLs at runtime from `window.location.origin`, so they work in any
environment as long as each one is allow-listed:

- **OAuth (Google/GitHub)** and **signup email confirmation** → `/auth/callback`
- **Password reset emails** → `/reset-password` (where the user sets a new password)

## 4. OAuth providers (optional)

In Supabase Dashboard → Authentication → Providers:

- **Google** — enable, add Client ID + Secret from Google Cloud Console.
  In Google Cloud → Credentials, set the **Authorized redirect URI** to your
  Supabase callback: `https://<project-ref>.supabase.co/auth/v1/callback`.
- **GitHub** — enable, add Client ID + Secret from a GitHub OAuth App
  (Settings → Developer settings → OAuth Apps). Set the GitHub app's
  **Authorization callback URL** to `https://<project-ref>.supabase.co/auth/v1/callback`.

Supabase handles the provider exchange and then redirects the browser to the
`/auth/callback` route registered in step 3, where Framefore finishes the session
and forwards the user to `/app`.

## 5. Email confirmation

In Supabase Dashboard → Authentication → Settings:
- If you want immediate access after signup: disable "Enable email confirmations"
  (signup returns a session and the app redirects straight to `/app`).
- If you want email verification: leave it enabled. The app shows a
  "Check your email to confirm your account" message; the confirmation link returns
  to `/auth/callback`.

## 6. Security notes

- Passwords are never stored or logged by the app — Supabase Auth handles hashing.
- Sessions/tokens are managed by `supabase-js`; the app does not write tokens to
  custom `localStorage`.
- Keep RLS enabled on every table. Cloud project storage and its RLS policies are a
  later phase — this phase is auth only and does not read or write project data to Supabase.
