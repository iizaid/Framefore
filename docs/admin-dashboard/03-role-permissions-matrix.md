# 03 — Role Permissions Matrix

Roles are defined in [0006_admin_roles.sql](../../supabase/migrations/0006_admin_roles.sql):
`owner ⊃ admin ⊃ (support, reviewer)`. This matrix is the contract the UI renders
*and* the server enforces. **UI hiding is cosmetic; the right-most "Enforced by"
column is the real boundary.**

> **MVP access decision (important).** The SQL `is_admin()` today resolves to
> **owner or admin only**, and there are **no admin-console read policies for
> `support`/`reviewer`**. Therefore **Admin MVP gates `/admin` to owner/admin
> only.** The `support` and `reviewer` columns below describe the *intended*
> model once a dedicated helper (e.g. `is_staff()` / an extended
> `get_current_user_roles()` gate) **and** matching read policies/Edge functions
> are added — they are **🔮 future** until then. `AdminGuard` should treat
> support/reviewer as **not yet authorized** for the console in MVP.

Legend: ✅ allowed · ❌ denied · 🔒 owner-only · 🧩 Edge Function required ·
🔮 future · ⓕ future for support/reviewer (owner/admin only in MVP)

| Action | owner | admin | support | reviewer | user | guest | Enforced by |
|---|---|---|---|---|---|---|---|
| Access `/admin` | ✅ | ✅ | ⓕ | ⓕ | ❌ | ❌ | `AdminGuard` (`is_admin()`); support/reviewer 🔮 |
| View dashboard metrics | ✅ | ✅ | ⓕ | ⓕ | ❌ | ❌ | RLS / view grants (`is_admin()`) |
| View users list | ✅ | ✅ | ⓕ | ⓕ | ❌ | ❌ | admin view / Edge fn ([07](07-user-management-plan.md)) |
| View user details | ✅ | ✅ | ⓕ | ⓕ | ❌ | ❌ | admin view / Edge fn |
| View user roles | ✅ | ✅ | ⓕ | ⓕ | ❌ | ❌ | `user_roles` SELECT (`is_admin()`) |
| Grant owner | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | `grant_app_role` (`is_owner()`) |
| Revoke owner | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | `revoke_app_role` (`is_owner()` + last-owner guard) |
| Grant admin | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | `grant_app_role` (`is_owner()`) |
| Revoke admin | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | `revoke_app_role` (`is_owner()`) |
| Grant support/reviewer | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | `grant_app_role` (`is_admin()`) |
| Revoke support/reviewer | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | `revoke_app_role` (`is_admin()`) |
| View admin audit logs | ✅ | ✅ | ⓕ | ⓕ | ❌ | ❌ | `admin_audit_events` SELECT (`is_admin()`)¹ |
| View security events | ✅ | ✅ | ⓕ | ⓕ | ❌ | ❌ | needs admin view/Edge fn² |
| View rate-limit events | ✅ | ✅ | ⓕ | ⓕ | ❌ | ❌ | 🧩 Edge fn (table is service-only) |
| View storage metadata | ✅ | ✅ | ⓕ | ⓕ | ❌ | ❌ | 🧩 Edge fn / admin view |
| View user **project metadata** | ✅ | ✅ | ⚠️🔮 | ⚠️🔮 | ❌ | ❌ | 🔮 after cloud sync ([09](09-project-visibility-and-support-plan.md)) |
| View user **project content** (prompts/scripts/images) | ⚠️🧩 | ⚠️🧩 | ❌ | ❌ | ❌ | ❌ | 🔮 justified+logged Edge fn only |
| Modify user project content | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | not built; future 🧩 + audit |
| Delete user project content | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | future 🧩 + audit |
| Suspend user | 🔒🧩 | ⚠️🧩 | ❌ | ❌ | ❌ | ❌ | 🔮 Edge fn (`account_status`, see [14](14-database-views-rpcs-and-migrations.md)) |
| Ban user | 🔒🧩 | ❌ | ❌ | ❌ | ❌ | ❌ | 🔮 Edge fn |
| Delete user | 🔒🧩 | ❌ | ❌ | ❌ | ❌ | ❌ | 🔮 `auth.admin` Edge fn |
| Export audit logs | ✅🧩 | ✅🧩 | ❌ | ❌ | ❌ | ❌ | 🔮 Edge fn (`admin-export-audit`) |
| Manage settings/feature flags | 🔒 | ⚠️ | ❌ | ❌ | ❌ | ❌ | 🔮 `system_settings`/`feature_flags` |
| View system health | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | config probes + 🧩 Edge fn |

¹ `support`/`reviewer` are not `is_admin()` in SQL today (only `owner`/`admin`
are), and no admin-console read policy includes them. **MVP decision: `/admin`
is owner/admin only; support/reviewer get no console access yet.** To grant them
read access later, either (a) extend the relevant SELECT policies to include
`has_current_user_role('support'|'reviewer')` / a new `is_staff()` helper, or
(b) serve those reads through an Edge function that checks the broader role set,
**and** widen the `AdminGuard` to admit them. Tracked in
[24](24-open-questions-and-decisions.md).

² `security_events` today is SELECT-own only; an admin-wide read needs a new
policy or an Edge function ([10](10-security-events-and-audit-logs.md)).

## Strictness rules (non-negotiable)

1. **Owner-only** for any `owner`/`admin` grant or revoke — already enforced by
   `grant_app_role`/`revoke_app_role`'s `is_owner()` check.
2. **Admin-or-owner** for `support`/`reviewer` grants — enforced by `is_admin()`.
3. **support/reviewer have no console access in MVP** (no `is_admin()`/read
   policy covers them). When added later they are **read-only** — no mutation
   paths are ever exposed to them.
4. **No broad content access.** Reading user creative content is never a default;
   it is a future, justified, logged Edge-function path only.
5. **Every dangerous action** goes through an Edge Function and writes
   `admin_audit_events`.
6. **No self-promotion / no self-escalation.** Structurally impossible
   (no client write to `user_roles`); the UI additionally hides self-targeted
   privilege grants ([08](08-role-management-plan.md)).
