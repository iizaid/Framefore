# Supabase — Framefore Database

This folder contains Supabase SQL migration files and manual test queries for
the Framefore cloud backend. **These migrations are not applied automatically.**
Read this file before running anything.

---

## Migrations

| File | Purpose |
|---|---|
| `migrations/0001_profiles_and_auth_helpers.sql` | Profiles table, user settings table, `set_updated_at()` trigger function, `handle_new_user()` trigger |
| `migrations/0002_framefore_core_tables.sql` | projects, scenes, scene_links, canvas_notes, canvas_sections, canvas_links, scene_assets |
| `migrations/0003_framefore_rls_policies.sql` | Row Level Security enabled + per-command policies on every user-owned table |
| `migrations/0004_reference_images_storage.sql` | `reference-images` private Storage bucket + Storage RLS policies |
| `migrations/0005_security_events.sql` | Optional append-only per-user audit log table |
| `migrations/0006_admin_roles.sql` | `user_roles`, role-check functions, `grant/revoke_app_role()`, `admin_audit_events` |
| `migrations/0007_rate_limit_events.sql` | Service-role-only counter table for future Edge-Function rate limits |

### Companion docs

| Doc | Covers |
|---|---|
| `SCHEMA_OVERVIEW.md` | Tables, golden rule, 3-layer isolation, indexes |
| `ADMIN_MODEL.md` | Roles, no-self-promotion, first-owner bootstrap |
| `RATE_LIMITING.md` | What the DB does vs. dashboard/Cloudflare/Edge Functions |
| `SECURITY_REVIEW.md` | Pre-launch threat review + residual risks + checklist |

### What each migration does

**0001** — bootstraps the per-user data that must exist before any project data.
Creates `public.profiles` (display name + avatar) and `public.user_settings`
(theme, migration flag, preferences JSONB). The `handle_new_user()` trigger fires
on every `auth.users` INSERT — email signup and OAuth alike — and creates both
rows automatically. Uses `SECURITY DEFINER` with an explicit `SET search_path`
to prevent search-path injection. `profiles` and `user_settings` carry
production-safe CHECK constraints (name/avatar length, avatar must be an
`http(s)` URL, `preferred_theme IN ('system','light','dark')`, and `preferences`
must be a JSON object) — all NULL-tolerant so OAuth users without a name/avatar
still work.

**0002** — the core domain model in Postgres. Key design decisions:
- `scenes.order_index` **is the video order** (the "golden rule"). Export must
  always `ORDER BY order_index ASC`. Canvas `layout` {x,y} is stored on scenes
  as a JSONB column but is visual-only and never affects sequencing.
- Canvas tables (`canvas_notes`, `canvas_sections`, `canvas_links`, `scene_links`)
  are visual workspace annotations — they carry zero sequencing meaning.
- `client_id` columns on projects, scenes, and canvas_notes/sections hold the
  original local nanoid, enabling idempotent local→cloud migration.
- JSONB bags (`craft`, `notes_bag`, `global`) hold high-churn flexible fields;
  first-class columns are reserved for anything queried/sorted/indexed.
- `user_id` is denormalized onto every child table so RLS policies stay fast
  (simple `auth.uid() = user_id` equality, no joins).

**0003** — enables RLS on all nine user-owned tables and creates explicit
per-command policies (`SELECT`/`INSERT`/`UPDATE`/`DELETE`). Child table INSERT
policies also verify the parent project belongs to the same user (defense-in-depth
against a forged `project_id`). UPDATE policies use both `USING` and `WITH CHECK`
to prevent reading *and* writing across ownership boundaries.

**0004** — declares the `reference-images` private Storage bucket (10 MB limit,
PNG/JPEG/WebP/GIF only, SVG excluded). Storage RLS on `storage.objects` gates by
path segment: `SELECT`/`DELETE` check segment[1] (`{user_id}`) only — so orphan
cleanup after a project delete still works — while `INSERT`/`UPDATE` additionally
require segment[2] (`{project_id}`) to be a project the caller owns, blocking
placing or moving an object into another user's folder or a foreign project.
Binary uploads are wired in a later phase; this migration only declares the rules.

**0005** — optional append-only audit table. INSERT + SELECT own; no
UPDATE/DELETE from client. Useful for logging migration events, login anomalies,
password changes. Not required for MVP.

**0006** — admin role architecture. `user_roles` (owner/admin/support/reviewer)
is **read-only from the client and has no write policy** — the only write path is
the `SECURITY DEFINER` `grant_app_role()`/`revoke_app_role()` functions, which
require the caller to already be owner/admin (no self-promotion). The first owner
is bootstrapped manually via the SQL editor. `admin_audit_events` logs privileged
actions and is admin-readable only. Role-check helpers are **self-only unless
admin** (`has_current_user_role()`/`is_admin()`/`is_owner()` read only
`auth.uid()`; `admin_has_app_role()` returns `false` for non-admins) — there is no
public role-enumeration function. See `ADMIN_MODEL.md`.

**0007** — `rate_limit_events`, a service-role-only table (RLS on, zero policies)
that is infrastructure for **future** Edge-Function rate limits. It does **not**
and cannot rate-limit Supabase Auth login/signup — that is a dashboard +
CAPTCHA + Cloudflare concern. See `RATE_LIMITING.md`.

### Tenant integrity is structural, not just RLS

0002 adds composite UNIQUE constraints and composite FKs so that a scene, link,
or asset pointing at **another user's** project/scene is physically impossible to
store — enforced below RLS, even against the service role. 0003's UPDATE policies
add `WITH CHECK` parent/endpoint ownership so rows can't be *rewritten* across
tenants. See `SCHEMA_OVERVIEW.md` and `SECURITY_REVIEW.md`.

---

## How to apply

> **Review every migration in a staging project before running in production.**

### Method A — Supabase Dashboard SQL Editor (recommended for one-off setup)

1. Open your Supabase project → SQL Editor.
2. Paste and run each file **in order**: 0001 → 0002 → 0003 → 0004 → 0005 → 0006 → 0007.
3. Check for errors after each file before proceeding to the next.

### Method B — Supabase CLI

```bash
# Install (if not already)
npm install -g supabase

# Link to your project (get ref from Dashboard → Settings → General)
supabase link --project-ref <your-project-ref>

# Push migrations
supabase db push
```

The CLI reads files from `supabase/migrations/` in filename order. Each file
must be idempotent (they are — using `IF NOT EXISTS`, `OR REPLACE`, and
`DROP … IF EXISTS`).

---

## Required Supabase Auth settings

In **Dashboard → Authentication → URL Configuration**:

| Setting | Local dev | Production |
|---|---|---|
| Site URL | `http://localhost:5173` | `https://YOUR_DOMAIN.com` |
| Redirect URL (OAuth + email confirm) | `http://localhost:5173/auth/callback` | `https://YOUR_DOMAIN.com/auth/callback` |
| Redirect URL (password reset) | `http://localhost:5173/reset-password` | `https://YOUR_DOMAIN.com/reset-password` |

In **Dashboard → Authentication → Providers**:
- **Google**: enable, add Client ID + Secret from Google Cloud Console.
  Google's "Authorized redirect URI" → your Supabase callback:
  `https://<project-ref>.supabase.co/auth/v1/callback`
- **GitHub**: enable, add Client ID + Secret from GitHub OAuth Apps.
  GitHub's "Authorization callback URL" → same Supabase URL above.

---

## Required environment variables

In `.env.local` (gitignored — never commit):

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Get both from **Dashboard → Project Settings → API**.

**NEVER** add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`, any `VITE_*`
variable, or the repo. The service-role key bypasses all RLS and must only exist
in trusted server environments (Edge Functions, CI secrets, etc.).

---

## Verifying RLS manually

Run `tests/rls-manual-checks.sql` in the SQL Editor. It includes:

1. Confirm RLS is enabled on all tables.
2. Confirm all expected policies exist with correct commands.
3. Confirm `handle_new_user` and `set_updated_at` triggers are wired.
4. Confirm `scenes.order_index` is NOT NULL.
5. Confirm `reference-images` bucket is private.
6. Confirm Storage policies exist.
7. Simulation blocks (commented out) showing how to test cross-user isolation.
8. Export query to verify `order_index` ordering works correctly.

---

## Current phase status

| Phase | Status |
|---|---|
| 4.2 — Auth UI (login/signup/OAuth/reset) | ✅ Done |
| 4.2 mini-patch — callback cleanup + reset page | ✅ Done |
| **4.3 — Database migrations (this folder)** | ✅ SQL written, not yet applied |
| **4.3.1 — Production hardening (FKs, RLS, admin, rate-limit, docs)** | ✅ SQL/docs written, not yet applied |
| 4.4 — Cloud repository layer (TypeScript) | ⏳ Next |
| 4.5 — Local → cloud migration UI | ⏳ Future |
| 4.6 — Project sync + conflict resolution | ⏳ Future |

The app is still **fully local-first**. No frontend code reads from or writes to
these tables yet. Applying these migrations creates the schema but does not alter
any existing behaviour.

---

## Data lifecycle & privacy

- **Account deletion** — deleting an `auth.users` row cascades to `profiles`,
  `user_settings`, `projects`, and (via FKs) all scenes/links/notes/sections/
  assets/security_events/roles/rate-limit rows. **Storage objects do NOT cascade**
  — a cleanup job/Edge Function must delete the user's `reference-images/{user_id}/`
  prefix explicitly. A destructive `delete_account()` function is intentionally
  **not** implemented yet (do it server-side, with confirmation + audit).
- **Project deletion** — cascades to all child rows; Storage objects under that
  project's path must be deleted by the app/Edge Function (orphan risk otherwise).
- **Audit / rate-limit retention** — `security_events`, `admin_audit_events`, and
  `rate_limit_events` grow unbounded. Add a scheduled purge (e.g. keep 90–180 days;
  `rate_limit_events` can use `expires_at`). Purge is a service-role operation.
- **Backups** — enable Point-in-Time Recovery on the Supabase project; verify a
  restore before launch.
- **GDPR/privacy** — store only a salted `ip_hash` (never raw IPs); never log
  tokens/passwords; support data export via the per-user SELECT policies.

See `SECURITY_REVIEW.md` for the full residual-risk list and pre-launch checklist.

## Important warnings

- Do not run migrations blindly on a production project. Test in staging first.
- Do not run 0003 before 0002 — policies reference tables that must exist.
- Do not run 0004's INSERT into `storage.buckets` if the bucket already exists
  via the Dashboard — the `ON CONFLICT DO NOTHING` handles it, but verify first.
- Keep the service-role key out of any frontend variable.
- Keep RLS enabled on every table. Never disable it to "fix" a permission error
  — fix the policy instead.
