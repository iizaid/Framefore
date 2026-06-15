# 23 — Implementation Roadmap

Phased, additive, non-breaking. Each phase is independently shippable and leaves
`/app` local-first and untouched. Do not start a phase whose data producers don't
exist (that's how fake metrics happen).

---

### Phase A — Planning review *(this package)*
- **Goal:** agree scope, security model, MVP vs future.
- **Files:** `docs/admin-dashboard/*` (this folder).
- **DB/Edge:** none.
- **Risk:** none.
- **Acceptance:** owner signs off on goals/non-goals + the role/permission matrix.
- **Tests:** doc review; reconcile with Codex pre-admin branch once merged.

### Phase B — Frontend role helpers *(read-only, no UI)*
- **Goal:** the client can know the caller's roles.
- **Files:** `src/admin/lib/roles.ts`, `src/admin/store/useRoleStore.ts`,
  `src/admin/types.ts`.
- **DB/Edge:** `get_current_user_roles()` RPC (`0009`, [14](14-database-views-rpcs-and-migrations.md)).
- **Risk:** low (self-only RPC; no enumeration).
- **Acceptance:** `useRoleStore.load()` returns correct roles; resets on identity
  change; no effect on existing app.
- **Tests:** role values match SQL; second-user reset verified.

### Phase C — AdminGuard & route protection
- **Goal:** secure gate with no flicker; Forbidden/redirect states.
- **Files:** `AdminGuard`, `AdminForbidden`, `AdminBootScreen`; nest `/admin`
  routes in `App.tsx`.
- **DB/Edge:** none beyond B.
- **Risk:** medium (must not flash admin UI; must not break other routes).
- **Acceptance:** four-state matrix from [05](05-admin-routes-and-navigation.md)
  holds for every role + signed-out + unconfigured.
- **Tests:** access-control matrix ([21](21-testing-and-qa-plan.md)).

### Phase D — Admin layout shell
- **Goal:** sidebar/topbar/breadcrumbs/empty placeholders for each section.
- **Files:** `AdminLayout`, `AdminSidebar`, `AdminTopbar`, `AdminBreadcrumbs`,
  `AdminEmptyState`, `AdminSkeleton`, stub pages.
- **DB/Edge:** none.
- **Risk:** low.
- **Acceptance:** navigation works; role-hidden items hidden; honest empty states
  render; mobile drawer works.
- **Tests:** nav + responsive + a11y.

### Phase E — Overview metrics (safe tables only)
- **Goal:** real role counts + admin-actions counters + recent audit feed.
- **Files:** `OverviewPage`, `AdminMetricCard`, `audit.ts`.
- **DB/Edge:** reads `user_roles`, `admin_audit_events` (existing policies).
- **Risk:** low.
- **Acceptance:** every number sourced; future tiles use "available after" variant.
- **Tests:** counts match SQL ([06](06-dashboard-home-and-metrics.md)).

### Phase F — Users list (safe profiles/user_roles)
- **Goal:** browse users (no auth.users fields yet).
- **Files:** `UsersPage`, `AdminDataTable`, `AdminFilterBar`, `users.ts`,
  `AdminRoleBadge`, `AdminUserAvatar`.
- **DB/Edge:** `admin_list_user_overview()` (+view) `0009`.
- **Risk:** medium (admin-wide profile read — must be `is_admin()`-checked,
  fail-closed; keep `profiles` own-only).
- **Acceptance:** admins see list; non-admins denied; cursor pagination + search.
- **Tests:** RLS bypass attempts denied; pagination stable.

### Phase G — User detail page
- **Goal:** one user's profile + roles + their audit history.
- **Files:** `UserDetailPage`, `UserDetailDrawer`.
- **DB/Edge:** reads from F + `admin_audit_events` by target.
- **Risk:** medium (PII display — mask phone, audit reveal — [07](07-user-management-plan.md)).
- **Acceptance:** deep links work; unknown id → empty state; PII handled.
- **Tests:** detail correctness; PII reveal audited.

### Phase H — Role management UI
- **Goal:** guarded grant/revoke.
- **Files:** `RolesPage`, `RoleGrantDialog`, `AdminConfirmDialog`, `AdminDangerZone`.
- **DB/Edge:** `grant_app_role`/`revoke_app_role` (existing).
- **Risk:** medium (mutation) — but DB enforces all rules.
- **Acceptance:** all [08](08-role-management-plan.md) edge cases handled; every
  action audited; last-owner/self guards hold.
- **Tests:** role-management suite ([21](21-testing-and-qa-plan.md)).

### Phase I — Audit / security / rate-limit viewers
- **Goal:** log viewers with filters.
- **Files:** `AuditPage`, `SecurityPage`, `AbusePage`, `AdminAuditTimeline`.
- **DB/Edge:** audit (existing); security (needs admin-read policy or Edge fn +
  producers — ships with honest empty state); abuse (Edge fn — placeholder until
  then).
- **Risk:** low–medium (privacy of security data).
- **Acceptance:** audit real; security/abuse honest-empty until producers exist.
- **Tests:** [10](10-security-events-and-audit-logs.md)/[11](11-rate-limit-and-abuse-monitoring.md) criteria.

### Phase J — Edge functions for privileged actions
- **Goal:** auth-metadata user list, view-storage-object, system health,
  (later) suspend/export/cleanup.
- **Files:** `supabase/functions/*`, `src/admin/lib/edge.ts`.
- **DB/Edge:** service role in function secrets; per-fn contract ([13](13-admin-actions-and-edge-functions.md)).
- **Risk:** **high** (service role) — strict authz + audit + sanitized errors.
- **Acceptance:** 401/403 correct; body-spoofing ignored; every effect audited;
  no service key in client.
- **Tests:** Edge-fn security tests.

### Phase K — Storage overview
- **Goal:** avatar footprint now; reference-image totals post-sync; orphan report.
- **Files:** `StoragePage`.
- **DB/Edge:** `profiles` now; `admin-storage-cleanup` (report mode) Edge fn.
- **Risk:** medium (viewing user files is audited).
- **Acceptance:** real avatar counts; honest empty for reference images; viewing
  audited.
- **Tests:** [12](12-storage-and-avatar-moderation.md) criteria.

### Phase L — System health + production hardening
- **Goal:** health page; complete the launch checklist.
- **Files:** `SystemPage`, `RunbookPage`.
- **DB/Edge:** `admin-system-health` Edge fn.
- **Risk:** low.
- **Acceptance:** [22](22-production-hardening-checklist.md) fully checked;
  sign-off test passes.

### Phase M — Future: cloud project visibility *(after cloud sync)*
- **Goal:** project metadata viewer once sync exists.
- **Files:** `ProjectsPage` (real), `admin_project_overview` fn.
- **DB/Edge:** post cloud-sync tables populated.
- **Risk:** medium (privacy; golden rule — order by `order_index`, canvas labelled
  non-sequencing — [09](09-project-visibility-and-support-plan.md)).
- **Acceptance:** project metadata correct; no content browsing; golden rule held.

---

## Dependency order

A → B → C → D → E → F → G → H → I → (J unlocks richer F/G/I/K) → K → L → M(after sync)

**Recommended first build after sign-off: Phase B**, then C. Smallest safe steps
that unlock everything else.
