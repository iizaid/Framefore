# 01 — Current System Audit

A factual snapshot of what exists in the repo today (the basis for every later
decision). Sources are linked.

## Stack

- React 18 + TypeScript, Vite 5, Tailwind 4, Zustand 5, react-router-dom 6,
  `@supabase/supabase-js` 2, framer-motion, lucide-react, `@xyflow/react`
  (canvas), `idb-keyval` (local blobs). See [package.json](../../package.json).
- No data-fetching/cache library (no TanStack Query). State is Zustand + direct
  Supabase calls.

## Routes (today)

From [src/App.tsx](../../src/App.tsx) — `BrowserRouter`, all pages lazy-loaded:

| Route | Page | Auth gate |
|---|---|---|
| `/` | LandingPage | none (public) |
| `/app` | AppWorkspacePage | **none** (local-first, deliberately open) |
| `/login` `/signup` | Login/Signup | none |
| `/auth/callback` | OAuth/confirm return | none |
| `/reset-password` | password reset | reset session |
| `/profile` | ProfilePage | none in router (page handles signed-out) |
| `/admin` | **AdminPage placeholder** | **none — no guard yet** |
| `/pricing` | redirect to `/#pricing` | — |
| `*` | redirect to `/` | — |

There is **no `<ProtectedRoute>`** yet; App.tsx comments note Phase 4.3 will add
one. `/admin` currently renders a static placeholder with three decorative
panels and the copy "Admin dashboard coming soon… Roles and permissions are not
active yet" ([src/pages/AdminPage.tsx](../../src/pages/AdminPage.tsx)).

## Auth state

[src/store/useAuthStore.ts](../../src/store/useAuthStore.ts) (Zustand):
`{ user, session, loading, initialized, error }` + actions (`signIn`, `signUp`,
`signOut`, `signInWithGoogle`, `signInWithGitHub`, password reset/update, resend
confirmation). `init()` restores the session and binds a single
`onAuthStateChange` listener. **No role/admin awareness exists in the store.**

[src/lib/supabase.ts](../../src/lib/supabase.ts) exports `supabase` (a client or
`null` when env vars are missing) and `isSupabaseConfigured`. Every data layer
guards on these. Only `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are used —
**the anon key only; no service role anywhere in the frontend** (correct).

## Profile system

[src/lib/profile.ts](../../src/lib/profile.ts) is the model to imitate for all
admin data access: a `Result<T>` type, `requireClient()`/`requireUserId()`
guards, input sanitization, `friendlyDbError()` mapping (handles `23505`/`23514`),
and avatar signed-URL resolution. [src/store/useProfileStore.ts](../../src/store/useProfileStore.ts)
wraps it and **resets on identity change** (so a second user never sees the
first user's data — a pattern the admin store must copy).

## Local-first `/app`

[src/store/useStore.ts](../../src/store/useStore.ts) persists projects to
IndexedDB (`framefore-state`, **store version 9**) with image blobs in a separate
store (`framefore-images`). Projects are account-scoped *locally* via
`ownerUserId` (`null` = guest). `App.tsx`'s `useSyncProjectOwner()` keeps the
filter in sync with the session. **Project data never reaches Supabase today.**

## Supabase schema (written, hardened — not necessarily applied/wired)

Per [supabase/SCHEMA_OVERVIEW.md](../../supabase/SCHEMA_OVERVIEW.md): migrations
`0001–0008` exist and are reviewed, but the overview states they are *"Not yet
applied to any Supabase project, and not wired to the app."* Treat application
status as environment-dependent and verify before building.

| Table | State | Admin relevance |
|---|---|---|
| `profiles` | wired (Profile page) | user list source (self-RLS today) |
| `user_settings` | exists | theme/migration prefs |
| `projects`,`scenes`,`scene_*`,`canvas_*` | exist, **not wired** | empty until cloud sync |
| `scene_assets` | exists, not wired | storage metadata source later |
| `security_events` | exists, **not wired** (no inserts from app) | security viewer (empty today) |
| `user_roles` | exists | role management source |
| `admin_audit_events` | exists | audit viewer source |
| `rate_limit_events` | exists, **service-only, inert** | abuse viewer (empty until Edge fns) |

### Buckets

- `avatars` — private, 2 MB, raster only, SVG excluded ([0008](../../supabase/migrations/0008_profile_account_fields_and_avatars.sql)).
- `reference-images` — private, 10 MB, raster only, SVG excluded ([0004](../../supabase/migrations/0004_reference_images_storage.sql)).
  Not yet used by the app.

### Role model (already strong)

`user_roles` (RLS: SELECT for self-or-admin, **no client write**),
`admin_audit_events` (admin SELECT, append-only), functions `is_admin()`,
`is_owner()`, `has_current_user_role()`, `admin_has_app_role()`,
`grant_app_role()`, `revoke_app_role()` (last-owner protection built in). See
[supabase/ADMIN_MODEL.md](../../supabase/ADMIN_MODEL.md).

## What exists but is NOT wired

- **No frontend role helpers.** Nothing calls `is_admin()`/`has_current_user_role()`.
- **No Edge Functions.** Confirmed in [RATE_LIMITING.md](../../supabase/RATE_LIMITING.md).
- **`security_events` has no producers** — the app never inserts rows.
- **`rate_limit_events` is inert** — needs Edge Functions to populate.
- **Cloud project tables empty** — app is local-first.
- **`auth.users` is unreadable from the browser** (no safe path to email,
  `last_sign_in_at`, provider, confirmation status without an Edge Function).

## Gaps before admin implementation

1. No way for the client to know the current user's role → must add a role helper
   + guard (Phase B/C).
2. No admin-readable user list beyond a caller's own `profiles` row → needs a
   view or Edge Function (see [07](07-user-management-plan.md), [14](14-database-views-rpcs-and-migrations.md)).
3. No Edge Function runtime/secrets configured → blocks every privileged action.
4. Event producers missing → security/abuse viewers would be empty.
5. Migrations' applied status must be confirmed per environment.

## Risks of implementing admin too early

- **Empty/misleading dashboards** (projects, security, abuse all empty) erode
  trust and tempt fake data — violates a core principle.
- **Over-broad admin RLS** added hastily could leak user content; `0006`
  deliberately avoids it.
- **Premature service-role exposure** if Edge Functions are rushed.
- **Wasted UI** for cloud-project features that can't be truthful pre-sync.

**Conclusion:** Build the *role gate, layout, and the views that map to real
data today* (roles, audit log, profiles-based user list). Defer projects,
security/abuse viewers, and privileged actions until their data producers exist.
