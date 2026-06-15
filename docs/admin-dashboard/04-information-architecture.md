# 04 — Information Architecture

The console is a left-sidebar app with a top bar. Sections below map 1:1 to
routes ([05](05-admin-routes-and-navigation.md)). Each lists purpose, data
source, minimum role, MVP fields, future fields, and risks.

## Section map

| Section | Route | Min role | Status |
|---|---|---|---|
| Overview | `/admin` | support | MVP (limited metrics) |
| Users | `/admin/users` | support | MVP (needs view/Edge fn) |
| User Details | `/admin/users/:userId` | support | MVP partial |
| Roles & Permissions | `/admin/roles` | admin (view: support) | MVP |
| Audit Logs | `/admin/audit` | admin¹ | MVP |
| Security Events | `/admin/security` | admin¹ | data empty until producers |
| Abuse / Rate Limits | `/admin/abuse` | admin¹ | needs Edge fns |
| Storage | `/admin/storage` | admin¹ | avatars now; rest after sync |
| Projects Metadata | `/admin/projects` | admin | future (after cloud sync) |
| System Health | `/admin/system` | admin | partial now |
| Settings | `/admin/settings` | owner (admin partial) | future |
| Documentation / Runbook | `/admin/docs` | support | MVP (static) |

¹ "admin" today; broadening to support/reviewer requires the policy/Edge-fn
decision in [03](03-role-permissions-matrix.md) note ¹.

## Per-section detail

### Overview (`/admin`)
- **Purpose:** at-a-glance operational pulse + quick links.
- **Source:** `count` queries on `profiles`, `user_roles`, `admin_audit_events`.
- **MVP fields:** total users, role counts (owner/admin/support/reviewer),
  admin actions (24h / 7d), recent audit entries (last 5).
- **Future:** new-users trends, projects/scenes/storage (post-sync), security &
  abuse counters (post-producers).
- **Risk:** temptation to show un-sourceable metrics → show only real ones; mark
  future tiles as a labelled "Available after cloud sync" placeholder, not a 0.

### Users (`/admin/users`)
- **Purpose:** find and inspect accounts.
- **Source:** `admin_user_overview` view (planned, [14](14-database-views-rpcs-and-migrations.md)) or
  `admin-list-users` Edge fn for auth metadata.
- **MVP fields:** display name, nickname, profile_completed, avatar status,
  roles, created_at (from `profiles`).
- **Future:** email, provider, last_sign_in_at, confirmation status (Edge fn);
  project/scene/storage counts (post-sync).
- **Risk:** `auth.users` not browser-readable → don't promise email/last-login
  until the Edge fn ships. See [07](07-user-management-plan.md).

### User Details (`/admin/users/:userId`)
- **Purpose:** one account's full picture + role actions.
- **Source:** profile row (admin view) + `user_roles` + (future) Edge fn + audit
  rows where `target_user_id = :userId`.
- **MVP fields:** profile metadata, roles with grant/revoke, audit history for
  this user.
- **Future:** auth metadata, projects, storage, support notes, account status.
- **Risk:** showing creative content — out of scope ([09](09-project-visibility-and-support-plan.md)).

### Roles & Permissions (`/admin/roles`)
- **Purpose:** see everyone with a role; manage grants.
- **Source:** `user_roles` (admin SELECT) joined to `profiles` for names.
- **MVP fields:** user, role, granted_by, created_at, actions (owner/admin gated).
- **Risk:** demoting self / removing last owner — guarded ([08](08-role-management-plan.md)).

### Audit Logs (`/admin/audit`)
- **Purpose:** immutable record of privileged actions.
- **Source:** `admin_audit_events` (admin SELECT, append-only).
- **MVP fields:** created_at, actor, target, action, metadata (e.g. `{role}`).
- **Future:** export ([13](13-admin-actions-and-edge-functions.md)), retention policy.
- **Risk:** PII in metadata — keep metadata minimal; never log tokens.

### Security Events (`/admin/security`)
- **Purpose:** auth/data security signal per user.
- **Source:** `security_events` (today SELECT-own; admin-wide needs change).
- **MVP fields:** created_at, user, event_type, metadata.
- **Risk:** **empty today** (no producers) — show an honest empty state and a
  note that event production is a later phase ([10](10-security-events-and-audit-logs.md)).

### Abuse / Rate Limits (`/admin/abuse`)
- **Purpose:** spot high-frequency / suspicious activity.
- **Source:** `rate_limit_events` (service-only) → **Edge fn required**.
- **Risk:** the table cannot throttle auth; the page must say where real abuse
  protection lives (dashboard/Cloudflare) — see [11](11-rate-limit-and-abuse-monitoring.md).

### Storage (`/admin/storage`)
- **Purpose:** storage footprint + moderation entry point.
- **Source:** `scene_assets` (size/mime, post-sync), `profiles.avatar_path`,
  Storage admin API via Edge fn for bucket totals.
- **MVP fields:** avatar count/footprint (from profiles); reference-image totals
  after sync.
- **Risk:** signed-URL viewing must be deliberate + logged ([12](12-storage-and-avatar-moderation.md)).

### Projects Metadata (`/admin/projects`)
- **Purpose:** project oversight — **future**.
- **Source:** `projects`/`scenes` (empty until cloud sync).
- **Risk:** **must not exist as a real page until sync**, or it lies. Render a
  clearly-labelled "Not available — projects are local-first until cloud sync"
  state. See [09](09-project-visibility-and-support-plan.md).

### System Health (`/admin/system`)
- **Purpose:** is the platform configured/healthy.
- **Source now:** `isSupabaseConfigured`, auth reachable, migrations probe.
- **Source future:** `admin-system-health` Edge fn (DB latency, storage, function
  status).
- **Risk:** don't fake green; show "unknown" where unmeasured.

### Settings (`/admin/settings`)
- **Purpose:** feature flags / system settings — **future**.
- **Source:** `system_settings`/`feature_flags` tables ([14](14-database-views-rpcs-and-migrations.md)).
- **Risk:** owner-only writes; audited.

### Documentation / Runbook (`/admin/docs`)
- **Purpose:** in-app operational runbook (owner bootstrap, incident steps,
  links to these docs + Supabase dashboards).
- **Source:** static content.
- **Risk:** none; keep links current.
