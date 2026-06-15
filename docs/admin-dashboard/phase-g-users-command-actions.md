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

## User Experience Polish
- **Removed Dashboard Noise**: Eliminated the decorative "dashboard" statistic cards from `/admin/users` in favor of a clean, text-based summary strip. The table is now the unambiguous anchor of the page.
- **Query Invalidation**: After a successful role mutation, TanStack Query immediately invalidates `adminQueryKeys.users.all` and `adminQueryKeys.overview()` to keep UI lists and role counts perfectly in sync. If a user edits their own roles, their local role store (`useAdminRoleStore`) is explicitly refreshed.

## Recommended Next Phase
With Role Management safely deployed, the next logical step would be **Phase H: User Detail View**. This would provide a dedicated page to drill down into a user's specific audit events, security history, and detailed metadata, establishing the groundwork for future suspension or content moderation tools.
