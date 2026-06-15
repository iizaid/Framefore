# 11 — Rate-Limit & Abuse Monitoring

## Be honest about what a SQL table can and cannot do

Straight from [supabase/RATE_LIMITING.md](../../supabase/RATE_LIMITING.md): **a
database table cannot rate-limit Supabase Auth.** Login/signup/reset requests hit
Supabase's auth endpoints and never touch our tables, so no row count throttles
them. The admin "Abuse" page must therefore *explain where real protection lives*
and only show the abuse signal it can legitimately source.

## Where abuse protection actually lives

| Threat | Correct control | NOT controlled by |
|---|---|---|
| Login/signup brute force | Supabase Auth rate limits (dashboard) + CAPTCHA/Turnstile + Cloudflare/WAF | ❌ SQL/RLS/frontend |
| Password-reset / magic-link spam | Supabase Auth email limits + Turnstile | ❌ frontend debounce |
| Network flood / DDoS | Cloudflare / Vercel / platform | ❌ Postgres |
| Custom API abuse (AI generations/hr, bulk export) | **Edge Function** counting `rate_limit_events` (service role) | ❌ client code |
| Unauthorized writes | RLS + composite FKs + CHECK | (solved in SQL) |

## What the Abuse page can show — by tier

### Available now
- Essentially **nothing with real data**: `rate_limit_events` is RLS-enabled with
  **zero policies** (service-only) and **no Edge function writes to it yet**, so
  it's inert. The page ships as an honest placeholder + a "where protection lives"
  explainer (links to the Supabase Auth rate-limit settings and Cloudflare).

### Requires Edge Functions
- Once Edge functions enforce custom limits (e.g. `ai_generate`, `bulk_export`)
  and record `rate_limit_events`, the page can show, via an `admin-abuse-overview`
  Edge fn (service role):
  - high-frequency actors (count by `user_id`/`ip_hash` + `action` over a window),
  - actions hitting their cap (429s),
  - large-file / storage-abuse attempts (from Edge upload guards),
  - suspicious bursts.
- **Privacy:** the table stores `ip_hash` (salted hash), **never raw IPs**. The
  admin UI shows only the hash / aggregates, never a reversible IP.

### Requires Cloudflare / external logs
- True network-level abuse (bot traffic, DDoS, WAF blocks) is visible only in
  Cloudflare/Vercel dashboards. The Abuse page should **link out** to those, not
  fake the data.

### Requires Supabase Auth settings
- Auth brute-force/email-spam metrics live in the Supabase dashboard
  (Authentication → Rate Limits/Logs). Link out; surface a reminder if they
  appear unset (manual check item in [22](22-production-hardening-checklist.md)).

## Suggested Edge-function query (future)

```ts
// admin-abuse-overview: top noisy actors for an action in the last hour
const since = new Date(Date.now() - 3600_000).toISOString();
const { data } = await admin.rpc('rate_limit_top_actors', { p_action: 'ai_generate', p_since: since });
// rate_limit_top_actors: SELECT coalesce(user_id::text, ip_hash) AS key,
//   count(*) FROM rate_limit_events WHERE action=$1 AND created_at>=$2
//   GROUP BY key ORDER BY count DESC LIMIT 50;
```

## Page design

```
┌ Abuse / Rate Limits ──────────────────────────────────────────┐
│ ⓘ Auth brute-force protection is NOT handled here.            │
│   Configure it in Supabase Auth → Rate Limits + Turnstile,    │
│   and put the app behind Cloudflare.  [Open Supabase]  [WAF]  │
│                                                               │
│ Custom API limits (this app's Edge functions):               │
│   — No events recorded yet —                                  │  ← until Edge fns exist
│                                                               │
│ (future) Top actors · Capped actions · Large-file attempts    │
└────────────────────────────────────────────────────────────────┘
```

## Acceptance criteria

- The page never implies the DB throttles auth.
- It shows real `rate_limit_events`-derived data only once an Edge fn produces it;
  until then, an explainer + outbound links, no fake numbers.
- No raw IPs are ever displayed (hash/aggregate only).

## Manual QA

- With no Edge functions: page shows explainer + empty state, links resolve.
- After an Edge fn writes events: top-actors aggregate matches a manual SQL count.
