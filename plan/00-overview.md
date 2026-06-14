# 00 — Backend & Auth Vision Overview

> **Status:** Planning only. No code in this phase. These documents describe how
> Phase 4.2+ will add authentication and a Supabase backend to **Framefore**
> without disturbing the current local-first app.

## What Framefore is

Framefore is a workspace for **planning AI videos before generation**. A user
creates a *project*, fills it with *scenes* (prompts, narration, references,
camera/mood notes, AI model choices), arranges them on a visual *canvas*, and
*exports* a prompt pack / shot list / markdown handoff for an AI video tool.

The current app is **100% local-first**:

- Project JSON is persisted to **IndexedDB** via Zustand `persist`
  (store key `framefore-state`, see [src/store/useStore.ts](../src/store/useStore.ts)).
- Reference image binaries live in a **separate IndexedDB blob store**
  (`framefore-images`, see [src/lib/images.ts](../src/lib/images.ts)).
- There is **no account, no server, no network dependency** to use the app.

## Why we are adding auth

| Problem today | What auth/backend solves |
|---|---|
| Projects are trapped in one browser profile | Sign in anywhere, projects follow you |
| Clearing site data destroys all work | Cloud is the durable source of truth |
| No cross-device editing | Same account on laptop + desktop |
| No sharing / collaboration foundation | Owner-scoped rows are the prerequisite |
| No way to offer paid tiers later | Identity is required before billing |

## Design principles (non-negotiable)

1. **Local-first stays the default.** The app must keep working with no Supabase
   env vars configured. `supabase` is already `null`-safe
   ([src/lib/supabase.ts](../src/lib/supabase.ts)).
2. **Never destroy local data.** Migration is opt-in, copy-not-move, with a
   backup. See [08-local-to-cloud-migration-plan.md](08-local-to-cloud-migration-plan.md).
3. **The golden rule survives.** `project.scenes` array order = video order =
   export order. Canvas layout/notes/links are visual-only and must never
   influence sequence. The cloud schema preserves this with an explicit
   `order_index` on `scenes`.
4. **Anon key only in the frontend.** The service-role key never ships to the
   browser. RLS is the real security boundary.
5. **Build on existing scaffolding.** `useAuthStore`, `supabase.ts`, the auth
   pages and disabled provider buttons already exist — wire them, don't replace.

## What moves to Supabase vs stays local

| Concern | Today | After Phase 4.2+ |
|---|---|---|
| Identity / session | none | **Supabase Auth** |
| Project JSON | IndexedDB | IndexedDB cache **+ Postgres rows** (source of truth when signed in) |
| Reference image blobs | IndexedDB `framefore-images` | **Supabase Storage** bucket (per-user paths) |
| Export generation | client (`lib/export.ts`) | **unchanged — stays client-side** |
| Canvas/timeline logic | client (`useStore.ts`) | **unchanged** |

## What is explicitly NOT in this phase

- No package installs (Supabase JS is already a dependency).
- No DB migrations executed.
- No UI changes, no route protection, no changes to `useStore` persistence.
- No real OAuth, MFA, or phone wiring — only the **design** for them.

## High-level target architecture

```
                          ┌─────────────────────────────┐
                          │        Browser (Vite)        │
                          │                              │
  ┌────────────┐          │  React Router (App.tsx)      │
  │ Landing /  │◀────────▶│   /  /app  /login  /signup   │
  │ Auth pages │          │                              │
  └────────────┘          │  useAuthStore  ── supabase ──┼──┐
                          │  useStore (Zustand persist)  │  │
                          │     │                        │  │
                          │     ▼                        │  │
                          │  IndexedDB                   │  │
                          │   • framefore-state (JSON)   │  │   anon key + JWT
                          │   • framefore-images (blobs) │  │   (RLS enforced)
                          └──────────────────────────────┘  │
                                                             ▼
                          ┌──────────────────────────────────────────────┐
                          │                  Supabase                     │
                          │  Auth (email, OAuth, future phone/MFA)        │
                          │  Postgres: profiles, projects, scenes,        │
                          │            assets, canvas_* , user_settings   │
                          │  Storage: reference-images bucket             │
                          │  RLS: every row scoped to auth.uid()          │
                          │  Edge Functions (later, only where needed)    │
                          └──────────────────────────────────────────────┘
```

## Reading order for implementers

1. [01-current-app-analysis.md](01-current-app-analysis.md) — what exists now.
2. [02-auth-requirements.md](02-auth-requirements.md) → [04](04-auth-flows-login-signup-logout.md) — auth behavior.
3. [05](05-database-schema-plan.md) → [07](07-user-projects-persistence-plan.md) — data model & persistence.
4. [08](08-local-to-cloud-migration-plan.md) / [09](09-project-sync-strategy.md) — migration & sync.
5. [18-implementation-roadmap.md](18-implementation-roadmap.md) — the build order.
6. [20-open-questions-and-decisions.md](20-open-questions-and-decisions.md) — decisions needed from the product owner.
