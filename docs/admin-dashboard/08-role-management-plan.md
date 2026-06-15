# 08 — Role Management Plan

This is the **one mutating feature in the MVP**, and it's safe because the DB
already enforces every rule. The UI's job is to present the existing
`grant_app_role()` / `revoke_app_role()` functions ([0006](../../supabase/migrations/0006_admin_roles.sql))
with clear confirmation and good error handling — **not** to re-implement
authorization.

## What the DB already guarantees (do not duplicate, do rely on)

- `user_roles` has **no client write policy** → no direct insert/update/delete.
- `grant_app_role(target, role)`:
  - `owner`/`admin` grants require `is_owner()`;
  - `support`/`reviewer` grants require `is_admin()`;
  - `ON CONFLICT DO NOTHING` (duplicate grant is a no-op, not an error);
  - writes an `admin_audit_events` row (`action='grant_role'`, `metadata={role}`).
- `revoke_app_role(target, role)`:
  - same role-tier authorization;
  - **last-owner protection**: refuses to remove the final `owner`;
  - writes an audit row (`action='revoke_role'`).
- Invalid role string → exception. No authenticated caller → exception.

## UI flows

### Grant a role
1. From `/admin/roles` or a user detail page, click **Grant role**.
2. `RoleGrantDialog` shows roles the *caller* may grant (owner/admin see
   owner+admin only if owner; support/reviewer if admin). Disallowed roles are
   hidden, with a tooltip explaining owner-only where relevant.
3. Confirm dialog: "Grant **admin** to **bob@…**? This lets them manage
   support/reviewer roles." → `supabase.rpc('grant_app_role', { target_user, new_role })`.
4. On success: optimistic-off refetch of `user_roles` for that user, toast
   "Role granted — audit entry written", and the new audit row is visible in
   `/admin/audit`.

### Revoke a role
1. Click **Revoke** on a role chip → confirm ("Revoke **owner** from **alice**?").
2. `supabase.rpc('revoke_app_role', { target_user, old_role })`.
3. Handle the specific failures below with friendly copy.

## Edge cases & exact handling

| Case | DB behavior | UI handling |
|---|---|---|
| Revoke the last owner | function raises `cannot remove the last owner` | Block the button when owner count ≤ 1; if it still fails (race), show "You can't remove the last owner." |
| Non-owner grants admin/owner | function raises `only an owner may grant` | Hide owner/admin options for non-owners; if forced, show "Only an owner can do that." |
| Duplicate grant | `ON CONFLICT DO NOTHING` (silent) | Treat as success; refetch shows existing role (idempotent, no scary error) |
| Demote self | not blocked by DB (an owner *can* drop their own admin if another owner exists) | UI confirms with extra warning: "You're changing your **own** role. You may lose access to parts of the console." Never allow self-revoke of the last owner (covered by last-owner guard) |
| Self-promotion | structurally impossible (no client write; functions check existing role) | The "grant to self → higher role" option is simply absent |
| Target user no longer exists | FK `ON DELETE CASCADE` cleaned their rows; grant inserts a dangling row only if `auth.users` row exists | If target id is stale, surface "That user no longer exists." (Edge fn / refetch detects) |
| Invalid role | exception | Not reachable from UI (closed set of buttons) |

## Owner bootstrap (stays manual)

The **first owner** is created once via the Supabase SQL editor (service role),
documented in [ADMIN_MODEL.md](../../supabase/ADMIN_MODEL.md). The console **does
not** and **should not** provide a "make me owner" path — that would be a
bootstrap loophole. The Runbook page (`/admin/docs`) shows the SQL snippet for
reference only.

## Owner vs admin distinction (surface clearly)

- **owner**: can grant/revoke *any* role (incl. owner/admin); the only role that
  can manage other owners/admins.
- **admin**: full read access + can manage *support/reviewer* only.
- The role badges and the grant dialog must make this obvious so an admin isn't
  confused why owner/admin options are missing.

## Components

`RolesPage`, `RoleGrantDialog`, `AdminConfirmDialog`, `AdminRoleBadge`,
`AdminDangerZone` (for revokes). See [17](17-component-architecture.md).

## Acceptance criteria

- Owner can grant/revoke every role; admin only support/reviewer; support/reviewer
  see no mutation controls.
- Last-owner revoke is impossible from the UI (button disabled + server guard).
- Self-role changes require an extra explicit confirmation.
- Every grant/revoke produces a visible `admin_audit_events` row.
- Duplicate grants are silent successes; no console error surfaces to the user.

## Manual QA

- As owner: grant admin to a test user → verify role appears + audit row.
- As that new admin: confirm owner/admin grant options are hidden; grant support
  to someone → works + audited.
- Attempt to revoke the last owner → blocked.
- As support: confirm the entire `/admin/roles` mutation surface is absent.
