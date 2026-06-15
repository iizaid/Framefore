# 00 — Admin Dashboard Overview

## What it is

An internal operations console for Framefore staff, mounted at `/admin`. It is
**not** a user-facing feature and **not** a marketing surface. It exists so the
people running Framefore can answer operational questions ("how many users signed
up this week?", "who has admin?", "what privileged actions happened yesterday?")
and perform a small set of *safe, audited* administrative actions (primarily role
management) without dropping into the Supabase SQL Editor.

## Why it exists

Today the only way to inspect users, grant a role, or read the audit log is the
Supabase dashboard + raw SQL (see the bootstrap step in
[supabase/ADMIN_MODEL.md](../../supabase/ADMIN_MODEL.md)). That is fine for one
founder but does not scale to a small team and is error-prone (a stray `DELETE`
in the SQL editor has no guardrails). The Admin Console replaces ad-hoc SQL with:

- **Read-only visibility** into users, roles, audit/security/rate-limit events,
  and storage — sourced only from data that actually exists.
- **Guarded mutations** (role grant/revoke) that reuse the existing
  `grant_app_role()` / `revoke_app_role()` functions, which already enforce
  owner/admin rules and write `admin_audit_events`.
- **A trustworthy operational record** — every privileged action is auditable.

## Who can access it

Access is gated by the role model in
[0006_admin_roles.sql](../../supabase/migrations/0006_admin_roles.sql):

| Role | Console access | Default capability |
|---|---|---|
| `owner` | Full | Everything, incl. grant/revoke `owner`/`admin` |
| `admin` | Full (minus owner-only mutations) | Grant/revoke `support`/`reviewer`; read everything |
| `support` | Read-only operational views | Users, audit/security/abuse, storage — no mutations |
| `reviewer` | Read-only operational views | Same read scope as support; intended for content review tooling later |
| normal user | **None** — sees Forbidden | — |
| guest (signed out) | **None** — redirected to `/login` | — |

The console renders only what the caller's role permits, but UI hiding is
cosmetic — the real enforcement is server-side (see
[15-rls-and-service-role-security.md](15-rls-and-service-role-security.md)).

## What it must not do

- **Never** hold or use the service-role key in the browser.
- **Never** show fabricated metrics, placeholder counts, or buttons that do
  nothing. If a number can't be sourced, it isn't shown (see [06](06-dashboard-home-and-metrics.md)).
- **Never** give support/reviewer casual read access to users' creative content
  (prompts, scripts, reference images) — that requires a logged, justified Edge
  Function path (see [09](09-project-visibility-and-support-plan.md), [12](12-storage-and-avatar-moderation.md)).
- **Never** imply canvas layout defines video/export order. Export order is
  `scenes.order_index ASC`, full stop.
- **Never** delete users, suspend accounts, or mutate user content directly from
  the browser. Those are future, server-side, audited operations.
- **Never** become a generic SQL runner.

## Production principles

1. **Server is the boundary; client is convenience.** Mirror the existing
   `lib/profile.ts` discipline (derive identity from the session, validate
   before sending, map errors to friendly copy, RLS is the hard wall).
2. **Least privilege by default.** Read-only unless a role explicitly needs more.
3. **Everything privileged is audited.** Reuse `admin_audit_events`.
4. **Honesty over completeness.** A correct empty state beats a fake chart.
5. **Additive, non-breaking.** New files under `src/admin/`; `/app` untouched.
6. **Reuse what's already hardened.** The role functions, RLS, and storage rules
   already exist — the console calls them, it does not reinvent them.

## High-level architecture

```
                         BROWSER (anon JWT, never service role)
 ┌───────────────────────────────────────────────────────────────────────┐
 │  Admin Console (src/admin/*)                                            │
 │                                                                         │
 │  AdminGuard ──checks──> is_admin() / has_current_user_role() (RPC)      │
 │     │                                                                   │
 │     ├─ READ (safe, RLS-scoped)                                          │
 │     │     supabase.from('admin_audit_events').select()  ── is_admin()   │
 │     │     supabase.from('user_roles').select()          ── is_admin()   │
 │     │     supabase.from('profiles')... (self only today; admin view via │
 │     │                                    view/Edge fn — see 07/14)      │
 │     │                                                                   │
 │     ├─ GUARDED MUTATION (RLS-checked function)                          │
 │     │     supabase.rpc('grant_app_role',  {target_user, new_role})      │
 │     │     supabase.rpc('revoke_app_role', {target_user, old_role})      │
 │     │       └─ checks is_owner()/is_admin(), writes admin_audit_events  │
 │     │                                                                   │
 │     └─ PRIVILEGED ACTION (cannot be safe from browser)                  │
 │           fetch('/functions/v1/admin-list-users', {Authorization: JWT}) │
 └───────────────────────────────�│───────────────────────────────────────┘
                                  │ user JWT forwarded
                                  ▼
 ┌───────────────────────────────────────────────────────────────────────┐
 │  Supabase Edge Functions (service role lives ONLY here)                 │
 │   1. verify JWT → get caller uid                                        │
 │   2. assert is_admin()/is_owner() server-side                          │
 │   3. do the privileged thing (read auth.users, storage admin, …)       │
 │   4. write admin_audit_events                                          │
 └───────────────────────────────│───────────────────────────────────────┘
                                  ▼
 ┌───────────────────────────────────────────────────────────────────────┐
 │  Postgres  — RLS is the real boundary                                  │
 │   user_roles (no client write) · admin_audit_events (admin read)       │
 │   security_events (own) · rate_limit_events (service only)             │
 │   profiles · projects/scenes/... (owner-scoped RLS)                     │
 │   Functions: is_admin, is_owner, has_current_user_role,                │
 │              admin_has_app_role, grant_app_role, revoke_app_role        │
 └───────────────────────────────────────────────────────────────────────┘
```

### Relationship summary

- **Admin UI ↔ RLS:** All direct reads from the browser are still RLS-scoped.
  Admins can read `user_roles` and `admin_audit_events` *because the policies in
  0006 grant `is_admin()` SELECT* — not because the UI "is admin".
- **Admin UI ↔ Edge Functions:** Anything needing the service role (reading
  `auth.users`, bulk storage ops, suspend/ban) is a function call carrying the
  user's JWT; the function re-verifies the role server-side.
- **Edge Functions ↔ service role:** The service-role key lives only in function
  secrets. It bypasses RLS, so functions must do their own authorization.
- **Everything ↔ audit logs:** Every privileged mutation appends to
  `admin_audit_events`; the console's Audit viewer reads it back.
