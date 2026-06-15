# 06 — Dashboard Home & Metrics

**Core rule: do not invent metrics that cannot be sourced.** Every tile on the
home page must map to a real query against an existing table, or it does not
appear as a number. Where a metric needs cloud sync or an Edge function, show a
clearly-labelled "Available after X" placeholder — never a `0` dressed as a real
value.

## Metric tiers

### Tier 1 — available now (direct, RLS/grant-scoped reads)

| Metric | Query (admin caller) |
|---|---|
| Total users | `select count(*) from profiles` (via admin view — see note) |
| Profiles completed | `select count(*) from profiles where profile_completed` |
| Avatar uploads | `select count(*) from profiles where avatar_path is not null` |
| Role counts | `select role, count(*) from user_roles group by role` |
| Admin actions (24h / 7d) | `select count(*) from admin_audit_events where created_at > now()-interval '7 days'` |
| Recent admin actions | `select ... from admin_audit_events order by created_at desc limit 5` |

> **Note:** `profiles` is SELECT-own under current RLS — an admin can't count all
> rows directly. The home counts therefore need either the `admin_user_overview`
> view (with `is_admin()` security) or an Edge function. See
> [14](14-database-views-rpcs-and-migrations.md). Until that exists, the only
> *truly* admin-readable Tier-1 sources are `user_roles` and `admin_audit_events`,
> so the **minimum honest MVP home** is: role counts + admin-actions counters +
> recent audit feed. Everything else is Tier 2/3.

### Tier 2 — available only after cloud sync

`new users today/7d/30d` (needs `created_at` countable across users → view/Edge
fn), projects count, scenes count, reference-image uploads & footprint, "active
users" (needs activity signal). These render as labelled placeholders until
[09](09-project-visibility-and-support-plan.md) ships.

### Tier 3 — requires Edge Function / event tracking

`security events count` (needs producers, [10](10-security-events-and-audit-logs.md)),
`rate-limit events count` (service-only table, [11](11-rate-limit-and-abuse-monitoring.md)),
`failed auth events` (auth logs live in Supabase Auth, not our tables — Edge fn
or dashboard only), full `system health` ([04](04-information-architecture.md)).

### Tier 4 — future analytics

Retention, funnels, cohort trends, per-platform breakdowns. Out of scope; do not
stub.

## Home layout

```
┌ Overview ─────────────────────────────────────────────────────────┐
│  [Users]   [Profiles complete]  [Avatars]   [Admin actions 7d]     │  ← Tier 1
│   1,204         812 (67%)          540            23               │
│                                                                    │
│  Roles:  owner 1 · admin 3 · support 2 · reviewer 1               │  ← Tier 1
│                                                                    │
│  ┌ Recent admin activity ───────────────────────────────────────┐ │  ← Tier 1
│  │ 2m ago  alice  granted support → bob                          │ │
│  │ 1h ago  alice  revoked reviewer → carol                       │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌ Available after cloud sync ──────────────────────────────────┐ │  ← Tier 2 (labelled)
│  │ Projects · Scenes · Reference-image storage                  │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

## Acceptance criteria

- Every displayed number is produced by a query shown in this doc / its view.
- No tile shows a value the backend can't currently produce; such tiles render
  the "Available after …" treatment (visually distinct, not a metric).
- Counts use `count(*)`/aggregations (`head: true, count: 'exact'`), not
  client-side `.length` of a fetched list (which would page-limit and mislead).
- The recent-activity feed links each row to the relevant user/audit entry.
- Loading shows skeletons; error shows a retry; empty shows "No activity yet".

## Manual QA

- Sign in as admin → home shows real role counts matching `select` in SQL editor.
- Grant a role → admin-actions counter increments and the new row appears in
  recent activity within a refresh.
- Confirm no network call from the home page uses anything but the anon client /
  approved Edge fns.
