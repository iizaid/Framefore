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

## 2. Profiles table

Run this in Supabase SQL Editor:

```sql
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Users can only read/update their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

## 3. Redirect URLs

Framefore sends OAuth, signup-confirmation, and password-reset links back to a single
callback route: **`/auth/callback`**. Register these in Supabase Dashboard →
Authentication → URL Configuration:

| Setting | Value |
| --- | --- |
| Site URL (local dev) | `http://localhost:5173` |
| Redirect URL (local dev) | `http://localhost:5173/auth/callback` |
| Redirect URL (production) | `https://YOUR_DOMAIN.com/auth/callback` |

The app builds this URL at runtime from `window.location.origin + "/auth/callback"`,
so it works in any environment as long as the URL above is allow-listed.

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
