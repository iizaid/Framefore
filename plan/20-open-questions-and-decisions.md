# 20 — Open Questions & Decision Log

Decisions the product owner should confirm before/while implementing, plus the
defaults this plan assumes if no answer is given.

## Questions needing confirmation

| # | Question | Recommended default | Impact |
|---|---|---|---|
| Q1 | Is `/app` ever fully gated, or always usable in local-only mode? | **Always allow local-only mode**; cloud features require sign-in | Phase F design; local-first promise |
| Q2 | Email confirmation ON in production? | **ON in prod, OFF in dev** | Signup flow, onboarding friction |
| Q3 | Auto-link identities on same verified email? | **Yes, verified-email only** | OAuth/account UX + security (doc 11/14) |
| Q4 | Cloud schema: normalized projects+scenes, or single JSONB blob per project? | **Normalized** (per-scene rows, `order_index`) | Querying, partial sync, golden rule (doc 05) |
| Q5 | Migration default: prompt on first login? | **Opt-in prompt, never auto, never delete local** | Data safety (doc 08) |
| Q6 | Sync model for MVP? | **Cloud-authoritative, debounced push, last-write-wins (project granularity)** | Conflict UX (doc 09) |
| Q7 | Token storage: accept `localStorage` default or pursue PKCE/cookie? | **Default localStorage + strong XSS posture; revisit PKCE** | Security (doc 14) |
| Q8 | Strict RLS insert (verify parent project) or trust denormalized `user_id`? | **Trust `user_id` with `with check`; add strict EXISTS on write paths if needed** | RLS complexity (doc 06) |
| Q9 | Production app domain? | placeholder `app.framefore.com` | Redirect URLs, env (doc 03/17) |
| Q10 | Magic-link login offered? | **No for MVP** (keep password + OAuth) | Auth surface (doc 10) |
| Q11 | Phone linking / login? | **No — not for a planning tool** | Scope (doc 12) |
| Q12 | MFA before launch? | **No — design ready, ship later (TOTP)** | Scope (doc 13) |
| Q13 | SVG allowed as reference image? | **Disallow** (or attachment-only) | Upload security (doc 14/15) |
| Q14 | "Clear local data on logout" option? | **Offer, default OFF** | Shared-device privacy |
| Q15 | Repo name mismatch: local folder `ShotBoard`, product `Framefore`, remote `iizaid/Framefore` | confirm canonical name in README/docs | Branding/config only |

## MVP decisions (assumed unless overridden)
- Auth: **email/password + Google + GitHub**. No phone, no MFA, no magic link.
- Backend: **Supabase only** — Postgres + RLS + Storage, **zero Edge Functions**
  initially (atomic-save RPC added during sync hardening).
- Data model: **normalized** with `scenes.order_index` enforcing the golden rule.
- Local-first preserved: `/app` works with no env; migration is opt-in; local
  data never auto-deleted.
- Exports stay **client-side and unchanged**.

## Future decisions (defer)
- Realtime sync (Supabase Realtime) + field-level/CRDT conflict merge.
- Project sharing / collaboration (schema doesn't preclude it).
- Branded transactional emails (welcome/drip) via Edge Function + email provider.
- Billing/plans, usage quotas (track `size_bytes` now to enable later).
- Admin panel (`/admin` stays placeholder until role model exists).
- Account deletion / GDPR export (Edge Function with service role).

## Things that should NOT be implemented yet
- No package installs (Supabase JS already present).
- No DB migrations run automatically.
- No route protection on `/app` (Phase F, and even then keep local-only mode).
- No changes to `useStore` local persistence / `migrate()` / `version`.
- No changes to `export.ts`, `images.ts`, or the `types.ts` semantics.
- No service-role key anywhere near the client.

## Recommended next implementation phase
**Phase B → C** from [18-implementation-roadmap.md](18-implementation-roadmap.md):
finish and wire the auth UI (`AuthForm`/`AuthLayout`/`AuthVideoPanel`) to the
already-built `useAuthStore`, delivering real **email/password + OAuth login,
signup with email confirmation, and logout** — with `/app` still open and local
data untouched. Defer the cloud projects schema (Phase G+) until the auth layer
is verified, since persistence depends on a confirmed identity layer.

Before starting, get answers to **Q1, Q2, Q4, Q5, Q6** — they shape the most code.
