# 02 — Admin Goals & Non-Goals

## MVP goals (first admin phase)

Each goal lists its data source and the *honest* state it can show today.

| Goal | Source | Buildable now? |
|---|---|---|
| **Secure admin access gate** — role checked server-side via `is_admin()`/`has_current_user_role()` RPC; Forbidden for non-admins; no-flicker loading | `0006` functions | ✅ Yes |
| **Admin home** — small set of real counts (users via profiles count, admin actions count, role counts) | `profiles`, `admin_audit_events`, `user_roles` | ✅ Yes (limited) |
| **Users list** — from `profiles` (+ roles) | `profiles`, `user_roles` view/Edge fn | ⚠️ Needs admin-read view or Edge fn ([07](07-user-management-plan.md)) |
| **User detail** — profile metadata + roles + (later) auth metadata | same | ⚠️ Partial now, full via Edge fn |
| **Role visibility** — who holds what | `user_roles` (admin SELECT) | ✅ Yes |
| **Role grant/revoke** (owner→owner/admin; admin→support/reviewer) with confirm + audit | `grant_app_role`/`revoke_app_role` RPC | ✅ Yes |
| **Audit log viewer** | `admin_audit_events` (admin SELECT) | ✅ Yes |
| **Security events viewer** | `security_events` | ⚠️ Table exists, **empty until producers wired** |
| **Rate-limit/abuse viewer** | `rate_limit_events` | ❌ Needs Edge fns (service-only, inert) |
| **Storage overview** | `scene_assets`, `profiles.avatar_path`, Storage API | ⚠️ Avatars now; reference-images after cloud sync |
| **Basic system health** | config probes + Edge fn | ⚠️ Partial now, full via Edge fn |
| **Manual support notes** (optional) | new `admin_support_notes` table ([14](14-database-views-rpcs-and-migrations.md)) | 🔮 Future migration |

### MVP acceptance criteria

- A non-admin hitting `/admin` (any sub-route) sees **Forbidden**, never any
  admin data, and never a flash of admin UI before the check resolves.
- A signed-out user is redirected to `/login?redirect=/admin`.
- `owner`/`admin` can read the user list, role rows, and audit log.
- `owner` can grant/revoke any role; `admin` can grant/revoke only
  `support`/`reviewer`; both flows confirm and produce an `admin_audit_events`
  row visible in the Audit viewer.
- No service-role key exists in any bundled asset (`grep` of `dist/` is clean).
- `/app` and `/profile` behave exactly as before; `npm run build` passes.
- Every visible number traces to a real query; empty data shows an empty state,
  not a zero-dressed-as-activity or a fake chart.

## Non-goals (explicitly out of the first phase)

| Non-goal | Why |
|---|---|
| Full billing/subscriptions | No billing system exists; out of scope |
| Full cloud project sync UI | Cloud sync not implemented; projects empty ([09](09-project-visibility-and-support-plan.md)) |
| Direct edits to user projects/scenes from browser | No admin RLS on content by design ([ADMIN_MODEL.md](../../supabase/ADMIN_MODEL.md)); privacy risk |
| Deleting user content from the browser | Destructive; future Edge fn + audit only |
| Deleting/suspending/banning users from browser | Needs `auth.admin` (service role) → Edge fn; future |
| Arbitrary SQL runner | Catastrophic blast radius; never |
| Service-role usage in the client | Defeats every security layer |
| Fake analytics / vanity charts | Violates "no fake metrics" |
| Broad/optimistic admin mutations from the browser | Mutations must be RLS-checked functions or Edge fns |
| Reading users' creative prompts casually | Privacy; only via justified, logged Edge fn ([09](09-project-visibility-and-support-plan.md)) |

## Guiding split

- **Safe from frontend (RLS):** reading `user_roles` & `admin_audit_events` as
  admin; reading own `security_events`; calling `grant/revoke_app_role`.
- **Must be Edge Function (service role):** `auth.users` data, suspend/ban,
  deletes, bulk storage ops, global exports, system health beyond config probes.
- **Must stay manual for now:** first-owner bootstrap (SQL editor); destructive
  account lifecycle.
- **Must not be built yet:** cloud-project content viewer, abuse viewer with real
  data, any content mutation.
