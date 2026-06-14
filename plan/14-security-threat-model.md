# 14 — Security Threat Model

Scope: Framefore as a Vite SPA + Supabase (Auth, Postgres, Storage). The anon key
is public by design; **RLS is the primary security control.**

## Assets to protect
- User account/session (JWT, refresh token).
- Private project data (prompts, narration, notes) — `projects`/`scenes`/`canvas_*`.
- Reference images (Storage).
- The Supabase **service-role key** (must never reach the browser).

## Threats & mitigations

### 1. Authentication threats (credential stuffing, weak passwords)
- Mitigate: Supabase password min length ≥ 8, optional leaked-password check,
  rate limiting, friendly lockout messaging. Encourage OAuth/MFA.

### 2. Session theft / token exfiltration
- supabase-js stores tokens in `localStorage` by default → readable by any XSS.
- Mitigate: **eliminate XSS** (below); short access-token TTL with refresh;
  consider PKCE flow; "sign out everywhere" via `signOut({ scope:'global' })`.

### 3. XSS (the highest-impact web risk here)
- React escapes by default — **never** introduce `dangerouslySetInnerHTML` with
  user/project content (prompts, notes, narration are user text).
- Mitigate: no raw HTML injection; sanitize any future markdown-to-HTML preview;
  strict dependency hygiene; CSP header at the host (Vercel/CF).

### 4. CSRF
- Token-based auth via `Authorization` header (not cookies) → classic CSRF mostly
  N/A. OAuth uses state + PKCE. Keep auth in headers, not cookies.

### 5. Broken access control / RLS bypass
- The big one. Mitigations:
  - RLS enabled on **every** user table + storage (doc 06).
  - `with check` on all inserts/updates; deny by default.
  - Never use the service-role key client-side to "work around" RLS.
  - QA: cross-user read/write tests (doc 19).

### 6. Exposed / misused Supabase keys
- Anon key public = fine **iff** RLS is correct.
- **Service-role key leakage = total compromise.** Keep it only in Edge
  Functions / server env; never in `VITE_*`, never in the repo, never in logs.
  Add a secret scan in CI.

### 7. Insecure token storage
- `localStorage` tokens are XSS-reachable. Accept with strong XSS posture, or
  evaluate cookie-based storage / shorter TTL. Document the tradeoff
  (doc 20 decision).

### 8. Email verification abuse / enumeration
- Don't reveal whether an email exists ("If an account exists, we sent a link").
- Rate-limit signup/reset/resend; app cooldowns + Supabase limits.

### 9. OAuth misconfiguration
- Strict redirect allow-list (no open wildcards in prod where avoidable).
- Auto-link identities **only on verified emails** (doc 11).
- Validate provider config; correct app name/logo to prevent phishing confusion.

### 10. Rate limiting / brute force
- Lean on Supabase Auth rate limits; add UI cooldowns; CAPTCHA if abuse spikes
  (Supabase supports hCaptcha/Turnstile on auth endpoints).

### 11. Project data privacy
- RLS isolation; no public project listing; signed URLs (not public) for images.

### 12. File upload risks (reference images)
- Validate MIME type + size client-side AND restrict in bucket config.
- Store under per-user path prefix; private bucket; signed URLs only.
- Don't trust filenames; generate storage object names (uuid). Strip path
  separators. Beware SVG (can carry script) — consider disallowing SVG or serving
  with `Content-Disposition: attachment` / no inline render. (doc 15)

### 13. Supabase Storage risks
- Bucket must be **private**; policies keyed to `auth.uid()` path segment.
- Avoid public buckets for user content; use time-limited signed URLs.
- Enforce size limits to prevent storage-cost abuse.

### 14. Local data exposure on shared machines
- IndexedDB persists after logout by design. Offer an explicit "clear local data
  on logout" option for shared computers (default off).

## Recommended mitigations summary
- RLS on everything + `with check` everywhere.
- Service-role key server-only; CI secret scan; `.env*` gitignored (`*.local`).
- No `dangerouslySetInnerHTML` on user content; CSP at host.
- Strict OAuth redirect allow-list; verified-email-only identity linking.
- Rate limits + cooldowns + optional CAPTCHA on auth.
- Private Storage bucket, signed URLs, MIME/size validation, uuid object names.
- Short token TTL; "sign out everywhere"; consider PKCE.

## Pre-launch security checklist
- [ ] RLS enabled + tested (cross-user denial) on all tables + storage
- [ ] No service-role key anywhere in client/repo (grep + CI scan)
- [ ] `.env.local` gitignored; no secrets committed
- [ ] OAuth redirect allow-list reviewed per environment
- [ ] Identity linking restricted to verified emails
- [ ] No `dangerouslySetInnerHTML` with project/user text
- [ ] CSP + security headers configured at host
- [ ] Storage bucket private; signed URLs; size/MIME limits; SVG policy decided
- [ ] Auth rate limits / CAPTCHA configured
- [ ] Email enumeration-safe messaging
- [ ] "Clear local data on logout" option for shared devices
