# 17 — Environment Variables & Deployment

## Variables used by the app
Only two, both already consumed in [src/lib/supabase.ts](../src/lib/supabase.ts):

| Var | Scope | Secret? |
|---|---|---|
| `VITE_SUPABASE_URL` | client (public) | no |
| `VITE_SUPABASE_ANON_KEY` | client (public) | no (RLS is the boundary) |

> Vite only exposes vars prefixed `VITE_` to the browser. Anything **without**
> that prefix stays server-only — which is exactly where secrets belong.

## `.env.local` (developer machine — gitignored)
`.gitignore` already ignores `*.local`, so `.env.local` is safe.
```
# .env.local  (DO NOT COMMIT)
VITE_SUPABASE_URL=https://your-dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-dev-anon-key
```

## `.env.example` (commit this — plan to add)
A committed template with no real values, so contributors know what to set:
```
# .env.example  (safe to commit — placeholders only)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```
> Action: add `.env.example` in the auth implementation phase (not this planning
> phase). Reference it from the README and [docs/supabase-auth-setup.md](../docs/supabase-auth-setup.md).

## Secrets that must NEVER be in the frontend or repo
- `SUPABASE_SERVICE_ROLE_KEY` — bypasses RLS; Edge Functions / server only.
- SMS provider (Twilio) tokens, email provider (Resend) keys, Stripe secrets —
  all server-only (Supabase function secrets), if/when those features ship.

## Host deployment (Vercel / Cloudflare Pages)
Set in the host's Environment Variables UI, per scope:

| Scope | Vars |
|---|---|
| Production | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (prod project) |
| Preview | same keys (prod or a staging project) |
| Development | from `.env.local` locally |

Build command `npm run build` (already `tsc -b && vite build`), output `dist/`.

## Redirect URLs (must match host origins — see doc 03)
Add to Supabase → Auth → URL Configuration:
- Local: `http://localhost:5173/**`
- Prod: `https://app.framefore.com/**` (placeholder domain)
- Preview: the host's preview origin(s), e.g. `https://*.vercel.app/**`
  (review wildcard risk in [14](14-security-threat-model.md)).

Also set **Site URL** to the canonical prod origin.

## Production domain placeholders
| Purpose | Placeholder |
|---|---|
| App origin | `https://app.framefore.com` |
| Supabase project | `https://<project-ref>.supabase.co` |
| OAuth callback | `https://<project-ref>.supabase.co/auth/v1/callback` |

Replace with real values at deploy time.

## Security rules for env vars
- Never commit `.env.local` (already gitignored via `*.local`).
- Only `VITE_`-prefixed, non-secret values reach the client.
- Rotate the anon key if you ever suspect RLS was misconfigured (but the key
  itself being public is expected).
- Add a CI secret scan to catch accidental service-role/key commits.

## What must never be committed
- `.env.local`, any file with real keys, the service-role key, provider secrets.
- Backups/exports that contain user data.

## Acceptance criteria
- Fresh clone + `.env.example` → developer fills `.env.local` → `npm run dev`
  connects to Supabase.
- Prod build on host reads env from host settings; redirect URLs resolve; OAuth
  + email links land on allowed origins.
