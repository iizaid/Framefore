# 18 — Implementation Roadmap

Phased build order. Each phase is independently shippable and must keep the app
working with **no Supabase env** and **no local data loss**. Nothing here is built
in the current (planning) phase.

> Legend — **Goal · Files · Acceptance · Risks · Build checks**

## Phase A — Supabase client setup ✅ (already largely done)
- **Goal:** Configured client, env handling, graceful no-config.
- **Files:** [src/lib/supabase.ts](../src/lib/supabase.ts) (exists),
  `.env.example` (add), [docs/supabase-auth-setup.md](../docs/supabase-auth-setup.md) (exists).
- **Acceptance:** `isSupabaseConfigured` correct; app runs with and without env.
- **Risks:** none significant.
- **Build checks:** `npm run build` green.

## Phase B — Auth UI wiring
- **Goal:** Replace disabled `ProviderButtons` placeholders with real email +
  OAuth forms; wire to existing store actions.
- **Files:** `src/components/landing/AuthForm.tsx`/`AuthLayout.tsx`/`AuthVideoPanel.tsx`
  (untracked, finish + wire), [LoginPage.tsx](../src/pages/LoginPage.tsx),
  [SignupPage.tsx](../src/pages/SignupPage.tsx), [AuthShell.tsx](../src/components/landing/AuthShell.tsx).
- **Acceptance:** forms render, validate, show loading/error; disabled-config
  state preserved.
- **Risks:** don't break the local-only "Open the app" path.
- **Build checks:** typecheck; manual auth-page QA.

## Phase C — Email/password auth
- **Goal:** Real signup/login/logout + session restore + confirm-email handling.
- **Files:** [useAuthStore.ts](../src/store/useAuthStore.ts) (add
  `resendConfirmation`, `requestPasswordReset`, `updatePassword`), new
  `/auth/callback`, `/auth/update-password` routes in [App.tsx](../src/App.tsx).
- **Acceptance:** doc 02/04 flows pass; already-logged-in redirect works.
- **Risks:** redirect must preserve `#/project/<id>` hash (doc 02 R6).
- **Build checks:** signup→confirm→login→refresh→logout E2E by hand.

## Phase D — OAuth (Google + GitHub)
- **Goal:** Enable provider sign-in.
- **Files:** provider buttons onClick → existing `signInWithGoogle/GitHub`;
  Supabase provider config (doc 03/11).
- **Acceptance:** both providers create user+profile; same-email linking behaves.
- **Risks:** redirect allow-list; verified-email linking (doc 14).
- **Build checks:** sign in via each provider on local + preview.

## Phase E — Profiles table
- **Goal:** `profiles` + `handle_new_user` trigger (already in setup doc);
  surface name/avatar in UI.
- **Files:** SQL (doc 05), account menu component.
- **Acceptance:** profile auto-created on signup/OAuth; RLS own-only.
- **Risks:** trigger ordering vs OAuth metadata (backfill on first load).
- **Build checks:** RLS cross-user denial test.

## Phase F — Protected routes (the deferred Phase 4.3)
- **Goal:** Introduce `<ProtectedRoute>` — but **keep local-only mode allowed**
  for `/app`; gate only cloud features and `/admin`.
- **Files:** [App.tsx](../src/App.tsx), new `ProtectedRoute`.
- **Acceptance:** signed-out users still use `/app` locally; `/admin` gated.
- **Risks:** accidental hard-gate of `/app` would break local-first promise.
- **Build checks:** signed-out `/app` still loads local projects.

## Phase G — Cloud projects schema
- **Goal:** Create all tables + RLS (docs 05/06) in Supabase.
- **Files:** SQL migrations (run manually/reviewed).
- **Acceptance:** tables exist; RLS enabled; manual insert/select scoped.
- **Risks:** missing `with check`; forgetting `order_index`.
- **Build checks:** RLS test matrix (doc 19).

## Phase H — Save/load projects per user
- **Goal:** Read/write projects to cloud; reconstruct `Project` (doc 05 read path);
  autosave (doc 07); cloud-authoritative when signed in.
- **Files:** new `src/lib/cloudSync.ts`, store integration (wrap `useStore`,
  don't change its local persist), [export.ts](../src/lib/export.ts) unchanged.
- **Acceptance:** create/edit/reorder reflected in DB; reload preserves order;
  **export order matches** (golden rule).
- **Risks:** order corruption; double-persistence drift (doc 09).
- **Build checks:** reorder→reload→export diff == identical.

## Phase I — Local-to-cloud migration
- **Goal:** Opt-in migrate local projects + blobs (doc 08).
- **Files:** `src/lib/migrate.ts`, prompt UI, `user_settings.has_migrated_local`.
- **Acceptance:** all local projects copied, zero dupes, local untouched, backup
  offered.
- **Risks:** partial failure, duplicate runs, missing blobs.
- **Build checks:** migrate→reload→export diff identical; re-run = no dupes.

## Phase J — Storage for reference images
- **Goal:** `reference-images` bucket + `scene_assets`; upload/signed-url/delete;
  migrate blobs (docs 15).
- **Files:** `src/lib/cloudImages.ts`, bucket policies.
- **Acceptance:** per-user isolation; signed URLs render; delete removes object.
- **Risks:** orphaned objects; SVG/upload validation.
- **Build checks:** cross-user storage denial; delete leaves no orphan.

## Phase K — MFA / phone (future)
- **Goal:** Optional TOTP MFA (doc 13); phone link if ever needed (doc 12).
- **Files:** account settings, MFA enroll/challenge UI.
- **Acceptance:** enroll/challenge/recovery work; disable works.
- **Risks:** recovery-code handling; lockout.
- **Build checks:** enroll→logout→login-with-code; recovery path.

## Dependency graph
```
A → B → C → D
        C → E → F
A → G → H → I
            H → J
(C,E) → K   (K is independent/future)
```

## Global build check after every phase
```
npm run build      # tsc -b && vite build must stay green
```
Plus the relevant slice of the QA checklist (doc 19), especially the
**regression block**: `/app`, export, canvas, timeline must behave identically.
