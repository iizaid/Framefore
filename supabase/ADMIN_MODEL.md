# Framefore — Admin Role Model

Defined in `migrations/0006_admin_roles.sql`.

## Roles

`owner` ⊃ `admin` ⊃ (`support`, `reviewer`)

| Role | Intended capability |
|---|---|
| `owner` | Full control; may grant/revoke any role including owner/admin |
| `admin` | May grant/revoke `support`/`reviewer`; read audit log + all role rows |
| `support` | Reserved for future support tooling (no extra DB grants yet) |
| `reviewer` | Reserved for future review tooling (no extra DB grants yet) |

Roles live in `public.user_roles` — **never** on `profiles`. A profile UPDATE can
therefore never touch privileges.

## Why a user cannot self-promote

This is structural, not a convention:

1. `user_roles` has RLS enabled with **only a SELECT policy**. There is no
   INSERT/UPDATE/DELETE policy for `authenticated`, so every client write is
   denied by default.
2. The only in-database write path is `grant_app_role()` / `revoke_app_role()`.
   They are `SECURITY DEFINER` but **check the caller's existing role first**:
   - granting/revoking `owner`/`admin` requires the caller to already be `owner`;
   - granting/revoking `support`/`reviewer` requires `admin` or `owner`.
   A regular user calling them gets an exception.
3. There is no "first row is free" bootstrap inside SQL — see below.

## Bootstrapping the first owner

Do this once, manually, in the **Supabase SQL Editor** (which runs as the
service role / `postgres`, bypassing RLS):

```sql
INSERT INTO public.user_roles (user_id, role, granted_by)
VALUES ('<YOUR-AUTH-USER-UUID>', 'owner', '<YOUR-AUTH-USER-UUID>');
```

Find your UUID in Dashboard → Authentication → Users. After this, the owner uses
`grant_app_role()` for everyone else (which also writes an audit row).

A safety rail in `revoke_app_role()` refuses to remove the **last** owner, so you
can't lock yourself out.

## Helper functions

| Function | Returns | Use |
|---|---|---|
| `is_admin()` | bool | caller is owner or admin |
| `is_owner()` | bool | caller is owner |
| `has_current_user_role(role)` | bool | **self-only** — caller's own role status (no uid arg to forge) |
| `admin_has_app_role(target, role)` | bool | arbitrary lookup, **admin-only** — returns `false` for non-admins |

All are `SECURITY DEFINER`, `STABLE`, `SET search_path = public`, with EXECUTE
revoked from `anon`/`public` and granted to `authenticated`.

### No public role enumeration

The earlier `has_app_role(uid, role)` was **removed**: being SECURITY DEFINER and
callable by any authenticated user, it let anyone probe an *arbitrary* user's
roles (a privacy oracle for locating admin accounts). Replacements:

- A normal user can check **only their own** status via `has_current_user_role()`
  / `is_admin()` / `is_owner()` — none take a user-supplied UUID.
- Arbitrary-user lookups go through `admin_has_app_role()`, which **fails closed**
  (returns `false`) unless the caller is an admin, so it cannot be used to
  enumerate roles.
- Admins may also read role rows directly via the `user_roles` SELECT policy
  (`auth.uid() = user_id OR is_admin()`).

If a stale `has_app_role(uuid, text)` exists in a previously-applied staging DB,
drop it: `DROP FUNCTION IF EXISTS public.has_app_role(uuid, text);`

## Admin access to USER CONTENT (deliberate decision)

This phase does **not** grant admins RLS read/write over user content
(`projects`, `scenes`, …). Broad admin RLS is easy to leak and hard to audit.

Production stance:
- Regular users access only their own data (enforced by RLS + FKs).
- Admins can read the **role table** and the **admin audit log** only.
- Any support/admin operation on user *content* should run in an **Edge Function**
  using the service role, writing every action to `admin_audit_events`.
- Narrow, explicit admin read policies on content may be added later **only** when
  a concrete support flow needs them — and must be documented here.

Never rely on a frontend-only admin check; the frontend can be bypassed.
