# 16 — API & Edge Functions Plan

Decide what runs directly from the frontend (with RLS) vs what needs server-side
Edge Functions. **Principle: prefer direct, RLS-protected client calls; add Edge
Functions only where a secret, elevated privilege, or server-only logic is
required.**

## What the frontend can do directly (no Edge Function)
With correct RLS, the SPA uses supabase-js for nearly everything:
- Auth: sign up/in/out, OAuth, password reset, email change, (future) MFA.
- CRUD on `projects`, `scenes`, `scene_assets`, `canvas_*`, `user_settings`.
- Storage upload/download (signed URLs) for reference images.
- Local-to-cloud migration (doc 08) — it's just batched inserts/uploads the user
  is authorized to do.
- **Exports** — stay 100% client-side ([src/lib/export.ts](../src/lib/export.ts)).
  No server involvement; reconstruct the `Project` from cloud rows, then run the
  existing pure functions.

## Where Edge Functions ARE warranted (later)
| Function | Why server-side | Phase |
|---|---|---|
| **Atomic project save (RPC)** | Multi-row project+scenes reorder in one transaction; prevents half-written order (golden-rule safety) | When sync hardening needed |
| Welcome / drip emails | Needs email provider key (Resend/Loops) — a secret | Future |
| Audit logging (`security_events`) | Trustworthy server-stamped events (ip, ua) | Future |
| Orphaned Storage cleanup | Lists/deletes across a user's bucket; scheduled | Future |
| Account deletion (GDPR) | Cascade delete rows + Storage + `auth.users` (needs admin/service role) | When required |
| Future billing/webhooks | Stripe webhooks must verify signatures server-side with a secret | If monetized |

### Atomic save as a Postgres RPC (recommended early-ish)
Instead of a full Edge Function, a `security definer` SQL function callable via
`supabase.rpc()` can wrap "upsert project + replace scene order" in a
transaction. Keeps reorder atomic without standing up Deno functions. Still
enforces ownership (`auth.uid()` inside the function).

```sql
-- sketch only; not executed this phase
create or replace function public.save_project_order(p_project uuid, p_order jsonb)
returns void language plpgsql security definer as $$
begin
  if not exists (select 1 from projects where id = p_project and user_id = auth.uid()) then
     raise exception 'not authorized';
  end if;
  -- apply order_index updates atomically from p_order
end;$$;
```

## What NOT to build yet
- No general API gateway / custom backend server — Supabase + RLS is the backend.
- No server-side export rendering, PDF, or video generation.
- No billing, webhooks, or admin panels (the `/admin` route stays a placeholder).
- No realtime sync infrastructure (doc 09 future).
- No email provider integration until branded emails are actually needed.

## Security notes
- Any Edge Function using the **service-role key** must validate the caller's JWT
  and authorize the action itself — service role bypasses RLS.
- Keep functions small, single-purpose, and secret-free in the repo (use Supabase
  function secrets / env).

## Decision
MVP ships with **zero Edge Functions**; everything is direct + RLS. Introduce the
atomic-save RPC during sync hardening, then add functions case-by-case as the
"warranted" table above becomes real. Confirm in
[20](20-open-questions-and-decisions.md).
