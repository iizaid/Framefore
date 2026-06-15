# Phase G: Users Command Center Actions

## Overview
Phase G transitions the Users list from a read-only table to a true Admin Command Center by introducing the first set of safe, audited, and strictly controlled database-backed actions: **Role Management**.

The goal was to provide Admins with the ability to grant and revoke application roles without exposing any insecure endpoints or bypassing the robust security architecture established in Phase 0006.

## Implemented Actions
- **Grant App Role**: Grants an `owner`, `admin`, `support`, or `reviewer` role to a user.
- **Revoke App Role**: Revokes a specific role from a user.

## What is Explicitly Forbidden
To ensure security, Phase G intentionally omits:
- No user deletion, suspension, or ban logic.
- No password resets or email changes.
- No impersonation features.
- No bulk actions.
- No access to user content, projects, or storage.
- No arbitrary database writes.

## Security & Architecture Model
1. **RPC-Only Data Contract**: The frontend has no direct write access to the `user_roles` table. All mutations are routed through the `grant_app_role` and `revoke_app_role` RPCs deployed in `0006_admin_roles.sql`.
2. **Built-in Audit Logging**: Both RPCs write natively to `admin_audit_events`. We rely entirely on the DB layer for the audit trail, ensuring no action can ever be taken without a permanent ledger entry.
3. **Frontend Self-Protection**: The `AdminRoleActionDialog` detects the authenticated user ID. It completely disables the "Revoke" button if the user tries to demote themselves from their own critical `owner` or `admin` role, preventing accidental console lockouts before the DB is even queried.
4. **Database Last-Owner Protection**: The `revoke_app_role` RPC already ensures that the last `owner` cannot be removed from the system.
5. **No Service Role Required**: This phase was implemented completely client-side via the standard authenticated Supabase client leveraging Row-Level Security and `SECURITY DEFINER` constraints.

### Phase G Hardening Patch
A subsequent hardening patch was applied to Phase G:
- **Error Mapping**: `roleActions.ts` was updated to accurately catch Postgres `SQLSTATE 42501` and map it gracefully to "Permission Denied" without leaking raw SQL strings. 
- **Owner-Only Gating**: The UI actively checks `isOwner` from `useAdminRoleStore`. If a standard `admin` attempts to open the dialog, the `owner` and `admin` action buttons are immediately disabled with the explanation: *"Only owners can change owner/admin roles."* The database RPC acts as the final security boundary.
- **Visual Polish**: Removed the decorative purple shield icon from the role dialog header to ensure perfect alignment with the minimalist flat-black visual system.

## User Experience Polish
- **Removed Dashboard Noise**: Eliminated the decorative "dashboard" statistic cards from `/admin/users` in favor of a clean, text-based summary strip. The table is now the unambiguous anchor of the page.
- **Query Invalidation**: After a successful role mutation, TanStack Query immediately invalidates `adminQueryKeys.users.all` and `adminQueryKeys.overview()` to keep UI lists and role counts perfectly in sync. If a user edits their own roles, their local role store (`useAdminRoleStore`) is explicitly refreshed.
- **Anchored Popover (UX Patch)**: The centered modal/dialog was replaced with a compact `position: fixed` anchored popover (`AdminRoleActionPopover`). No full-screen overlay, no background dim, no page blur. The popover opens beside the "Manage roles" button, clamps to viewport edges, and closes on outside-click or Escape. Inline confirmation (`Confirm grant` / `Confirm revoke`) is required before any RPC is called.

## Recommended Next Phase
With Role Management safely deployed, the next logical step would be **Phase H: User Detail View**. This would provide a dedicated page to drill down into a user's specific audit events, security history, and detailed metadata, establishing the groundwork for future suspension or content moderation tools.
