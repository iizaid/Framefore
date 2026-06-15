# 10 — Security Events & Audit Logs

Three append-only tables back the "Trust & Safety" section. They have different
audiences and maturity.

| Table | Purpose | Read access today | Producers today |
|---|---|---|---|
| `admin_audit_events` ([0006](../../supabase/migrations/0006_admin_roles.sql)) | Privileged admin actions | `is_admin()` SELECT | `grant/revoke_app_role` ✅ |
| `security_events` ([0005](../../supabase/migrations/0005_security_events.sql)) | Per-user auth/data security signal | SELECT-own only | **none** (app doesn't insert) |
| `rate_limit_events` ([0007](../../supabase/migrations/0007_rate_limit_events.sql)) | Abuse counters | none (service-only) | none — see [11](11-rate-limit-and-abuse-monitoring.md) |

## Admin Audit Logs (`/admin/audit`) — MVP, real data

- **Schema:** `id, actor_user_id, target_user_id, action, metadata jsonb, created_at`.
- **Today's events:** `grant_role`, `revoke_role` (with `metadata.role`). The set
  grows as Edge functions write more (e.g. `viewed_pii`, `suspended_user`,
  `storage_deleted`, `exported_audit`).
- **Viewer fields:** timestamp, actor (resolve to name via join), target, action
  (badge), metadata (pretty-printed), and a per-user filter.
- **Filtering:** by actor, target, action, date range ([19](19-search-filter-sort-pagination.md)).
- **Display:** reverse-chronological timeline (`AdminAuditTimeline`) on the
  overview/user pages; a dense table on `/admin/audit`.

## Security Events (`/admin/security`) — table exists, empty today

- **Schema:** `id, user_id, event_type, metadata jsonb, created_at` (immutable).
- **Intended event types** (from the migration comment):
  `user_login`, `password_changed`, `mfa_enrolled`, `local_migration_started`,
  `local_migration_completed`, plus future `signup`, `oauth_link`, `failed_login`*.
- **Two gaps to close before this viewer is useful:**
  1. **Producers.** The app must start inserting rows. Client-safe events
     (own `user_id`) can be inserted from the frontend under the existing
     `events_insert_own` policy — e.g. log `local_migration_completed` during
     the future cloud-sync migration. *Auth* events (`failed_login`) can't be
     captured client-side reliably → Edge fn / Supabase auth hooks.
  2. **Admin-wide read.** Today it's SELECT-own. To let admins see *all* users'
     events, add an admin SELECT policy (`is_admin()`), **or** read via an Edge
     function. This is a new migration ([14](14-database-views-rpcs-and-migrations.md));
     decide deliberately (privacy — see below).
- **MVP behavior:** ship the viewer with an honest empty state ("No security
  events recorded yet — event capture is enabled in a later phase"), wired to the
  table so it lights up automatically once producers exist.

\* "Failed login" never touches our tables (auth endpoints); see [11](11-rate-limit-and-abuse-monitoring.md).

## Which events are admin-only

- `admin_audit_events` — admin-only by policy. Correct.
- `security_events` — per-user by default; an admin-wide view is a **privileged**
  capability (it exposes login patterns). Gate to `is_admin()` (and decide whether
  support/reviewer get it — [03](03-role-permissions-matrix.md) note ¹).
- `rate_limit_events` — never client-readable; admin view only via Edge fn.

## Export policy

- **MVP:** no export (avoids a bulk-PII egress path before it's needed).
- **Future:** `admin-export-audit` Edge function (owner/admin), itself audited
  (`action='exported_audit'`), rate-limited, returns CSV/JSON for a bounded date
  range. See [13](13-admin-actions-and-edge-functions.md).

## Retention policy

- Audit logs: **keep long** (compliance value); never auto-deleted from the
  client. A server-side retention job (Edge fn / scheduled) may archive beyond
  e.g. 2 years — owner decision.
- Security events: retain ~90–180 days (operational signal), purge older
  server-side. `rate_limit_events` supports a TTL via `expires_at` for sweeps.
- Decisions tracked in [24](24-open-questions-and-decisions.md).

## Privacy & tamper resistance

- **Append-only by construction:** no client UPDATE/DELETE policies on any of the
  three tables. The console is read-only over them. Only the service role can
  purge (retention), which itself should be logged.
- **Minimal metadata:** never log passwords, tokens, full URLs, or full
  credentials (the migrations call this out explicitly). Keep `metadata` to ids +
  small descriptors.
- **PII in audit:** if an action records viewing PII, store *that it happened*,
  not the PII value.
- **Tamper resistance limits:** Postgres rows are mutable by the service role; a
  truly tamper-evident log (hash chaining / external WORM sink) is a future
  hardening item, noted in [22](22-production-hardening-checklist.md).

## Acceptance criteria

- Audit viewer shows real grant/revoke rows with correct actor/target/action.
- Security viewer renders an honest empty state and auto-populates when producers
  land (no fake seed rows).
- No client code can update/delete any audit/security/rate-limit row.
- Filters work and pagination is cursor-based on `created_at`.
