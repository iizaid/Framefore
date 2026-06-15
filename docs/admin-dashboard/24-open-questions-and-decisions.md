# 24 — Open Questions & Decision Log

Decisions needed from the owner before/while building. Each has a recommendation;
record the final call + date when made.

| # | Question | Options | Recommendation | Decision |
|---|---|---|---|---|
| 1 | Should **support/reviewer** read user content? | (a) never (b) metadata only (c) full via audited Edge fn | **(a) for MVP**; revisit per concrete support flow | _pending_ |
| 2 | Should the admin dashboard **launch before cloud sync**? | (a) yes, role/audit/users only (b) wait for sync | **(a)** — real value now (roles, audit, users); projects stay honest-empty | _pending_ |
| 3 | Which roles get **project metadata visibility** (post-sync)? | owner/admin only · +support · +reviewer | **owner/admin only**; support read-only metadata case-by-case | _pending_ |
| 4 | Is **user suspension** in MVP? | yes · no | **No** — needs `account_status` + enforcement design ([14](14-database-views-rpcs-and-migrations.md)) | _pending_ |
| 5 | Is **user deletion** in MVP? | yes · no | **No** — owner-only Edge fn, double-confirm, future | _pending_ |
| 6 | Should **audit logs be exportable**? | now · later · never | **Later** via audited `admin-export-audit` Edge fn ([13](13-admin-actions-and-edge-functions.md)) | _pending_ |
| 7 | Require **Cloudflare Turnstile** before launch? | yes · no | **Yes** — auth abuse isn't DB-controllable ([11](11-rate-limit-and-abuse-monitoring.md)) | _pending_ |
| 8 | What is strictly **owner-only**? | — | grant/revoke owner+admin · settings/feature-flag writes · user delete/ban (already enforced for roles by `is_owner()`) | _pending_ |
| 9 | What **needs Edge functions** (vs. RLS)? | — | auth.users reads · suspend/ban/delete · view others' storage · exports · cleanup · system health · abuse aggregation ([13](13-admin-actions-and-edge-functions.md)) | _pending_ |
| 10 | What must wait for **cloud project persistence**? | — | projects metadata viewer · project/scene/storage counts · most Tier-2 metrics ([06](06-dashboard-home-and-metrics.md)) | _pending_ |
| 11 | Should **support/reviewer** get admin-console access (read audit/security/users)? | yes now · owner/admin-only for MVP | **MVP: owner/admin only.** `is_admin()` doesn't cover support/reviewer and no console read policy includes them, so `/admin` gates to owner/admin. Granting support/reviewer access later requires a staff helper (`is_staff()` / extended gate) **+** matching SELECT policies/Edge fns **+** widening `AdminGuard`. Affects [03](03-role-permissions-matrix.md)/[05](05-admin-routes-and-navigation.md). | **MVP decided: owner/admin only**; broader access deferred |
| 12 | Show **email/last-sign-in** in users list? | now (Edge fn) · later | **Later** — requires Edge runtime; list works without it first ([07](07-user-management-plan.md)) | _pending_ |
| 13 | **Phone/PII** display: masked + reveal (audited) or hidden? | masked+audit · hidden | **Masked with audited reveal** on detail page only | _pending_ |
| 14 | **Security event producers**: which events, client vs Edge? | — | client-safe events (own user_id) from app; auth events via Edge/auth hooks ([10](10-security-events-and-audit-logs.md)) | _pending_ |
| 15 | **Audit retention** window? | e.g. 2y keep / 90d security | propose: audit 2y, security 180d, rate-limit via `expires_at` | _pending_ |
| 16 | **Tamper-evident** audit (hash chain / WORM sink)? | MVP · future | **Future** hardening; MVP relies on append-only RLS + service-role discipline | _pending_ |

## Resolved-by-design (no decision needed)

These are already settled by the existing schema — recorded so they aren't
re-litigated:

- **No self-promotion / no client role writes** — structural in `0006`.
- **Last-owner protection** — built into `revoke_app_role`.
- **No admin RLS on user content** — deliberate in `0006`; content access is Edge
  + audit only.
- **No service-role key in browser** — non-negotiable.
- **Golden rule** — export/video order is `scenes.order_index`; canvas is visual
  only; admin UI must never imply otherwise.
- **Buckets private, SVG excluded, signed URLs only** — set in `0004`/`0008`.

## Action items surfaced during planning

- ✅ **Resolved by Codex cleanup:** the earlier `public/client_secret_2_Framefore.json`
  has been **removed** from `public/` serving scope. Ongoing guard: **verify no
  OAuth client-secret JSON exists in `public/` or `dist/` on every build**
  (`ls public/client_secret* dist/client_secret*` → none) — listed in
  [22](22-production-hardening-checklist.md).
- **Verify migrations `0001–0008` applied status per environment** before deploy.
  They exist and may already be applied in the current Supabase setup; don't
  assume universally unapplied — confirm staging/prod individually.
