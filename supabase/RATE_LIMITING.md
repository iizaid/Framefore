# Framefore — Rate Limiting & Abuse Prevention

Honest boundary map. **A database table cannot rate-limit Supabase Auth.** This
doc says what each layer actually protects.

## What protects what

| Threat | Correct control | NOT controlled by |
|---|---|---|
| Login / signup brute force | Supabase Auth rate limits (dashboard) + CAPTCHA/Turnstile + Cloudflare/WAF | ❌ any SQL table, ❌ RLS, ❌ frontend |
| Password-reset / magic-link spam | Supabase Auth email rate limits + Turnstile | ❌ frontend debounce |
| Network flooding / DDoS | Cloudflare / Vercel / Supabase platform protections | ❌ Postgres |
| Custom API abuse (e.g. AI generations/hour, bulk export) | **Edge Function** counting `rate_limit_events` (service role) | ❌ client code |
| Unauthorized data writes | RLS + composite FKs + CHECK constraints | (this *is* solved in SQL) |
| Oversized payloads | CHECK length/range constraints | — |

Key point: auth requests hit Supabase's auth endpoints and **never touch your
tables**, so no row count can throttle them. Throttling auth is a *dashboard +
edge* concern.

## The `rate_limit_events` table (0007)

Infrastructure for **future** Edge-Function limits — inert until an Edge Function
uses it. RLS is enabled with **zero policies**, so no client can read or write it;
only the service role (Edge Functions) can. Regular users must never read global
rate-limit data (leaks other users' activity) or write it (could erase their own
history).

Intended usage inside an Edge Function (service role):

```ts
// 1. count recent events for this key
const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
const { count } = await admin
  .from("rate_limit_events")
  .select("*", { count: "exact", head: true })
  .eq("user_id", userId).eq("action", "ai_generate")
  .gte("created_at", since);
// 2. deny if over the limit
if ((count ?? 0) >= LIMIT) return new Response("rate limited", { status: 429 });
// 3. record this attempt (store ip_hash, never a raw IP)
await admin.from("rate_limit_events").insert({ user_id: userId, action: "ai_generate" });
```

Privacy: store a **salted hash** of the IP in `ip_hash`, never a raw IP. Never
store tokens or secrets in `metadata`.

## Required dashboard settings before launch

- **Authentication → Rate Limits**: set sensible per-hour caps for sign-in,
  sign-up, OTP, and email sends.
- **Authentication → enable CAPTCHA** (hCaptcha/Turnstile) for signup + password
  reset.
- Put the app behind **Cloudflare** (or Vercel's protections) for network-level
  abuse and bot mitigation.

## What is NOT solved yet (future phases)

- No Edge Functions exist yet; `rate_limit_events` is unused.
- Client-side debounce on project saves is **UX only**, never a security control.
