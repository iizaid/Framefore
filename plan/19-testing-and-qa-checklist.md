# 19 — Testing & QA Checklist

Manual + (future) automated checks per phase. The **regression block** is the
most important: auth must not change `/app`, export, canvas, or timeline.

## Signup
- [ ] Email+password signup (confirm ON) → "check email" state, no `/app` redirect
- [ ] Email+password signup (confirm OFF) → immediate session → `/app`
- [ ] Weak password rejected with clear message
- [ ] Duplicate email → "account exists" guidance (no enumeration leak)
- [ ] Loading + error states render; inputs disabled during submit

## Login
- [ ] Valid credentials → redirect to `?next` or `/app`
- [ ] Wrong password → "Email or password is incorrect."
- [ ] Unconfirmed email → confirm-first message + resend
- [ ] Already-logged-in visiting `/login` → redirect `/app` (after `initialized`)

## Logout
- [ ] `signOut` clears session, routes to `/`
- [ ] **Local projects still present after logout** (IndexedDB untouched)

## Email confirmation
- [ ] Confirmation link → `/auth/callback` → session → `/app`
- [ ] Expired link → friendly error + resend
- [ ] Resend respects cooldown

## Password reset
- [ ] Request sends email (enumeration-safe copy)
- [ ] Reset link → update-password screen → new password works
- [ ] Expired reset link handled

## OAuth
- [ ] Google sign-in → user + profile (name/avatar)
- [ ] GitHub sign-in → user + profile
- [ ] Same verified email across providers → one account (if linking ON)
- [ ] Cancel consent → clean return to `/login`
- [ ] Works on prod + preview origins (allow-list)

## Protected routes
- [ ] (Phase F) signed-out `/app` still works in local-only mode
- [ ] `/admin` gated appropriately
- [ ] Auth redirect preserves `#/project/<id>` hash

## Missing env
- [ ] No `VITE_SUPABASE_*` → app fully usable, "auth not configured" copy
- [ ] Store actions return graceful `{ error: "Auth is not configured…" }`
- [ ] No crashes, no console errors blocking render

## Local data preservation
- [ ] Sign in does NOT auto-upload or alter local projects
- [ ] Migration is opt-in; "Not now" leaves everything local
- [ ] Backup offered before migration
- [ ] Local project + image counts unchanged after migration

## Project save/load (cloud)
- [ ] Create project signed-in → row with correct `user_id`
- [ ] Edit fields → `updated_at` advances; reload shows changes
- [ ] Autosave debounces; "Saving/Saved" indicator correct
- [ ] Offline edit → reconnect → synced, no dupes

## Cross-device
- [ ] Login on device B shows device A's projects
- [ ] Concurrent edit → newer `updated_at` wins; other device informed; no silent
      loss (recovery snapshot kept)

## RLS (security)
- [ ] User B cannot select/update/delete User A's project rows
- [ ] Forged `user_id` insert rejected (`with check`)
- [ ] Storage: User B cannot read `A/...` paths; signed URL scoped
- [ ] No table reachable by anon key without RLS

## Security
- [ ] No service-role key in client/repo (grep + CI)
- [ ] No `dangerouslySetInnerHTML` on user/project text
- [ ] Auth rate limits / cooldowns active
- [ ] Tokens handled by supabase-js; "sign out everywhere" works
- [ ] Upload MIME/size validation; SVG policy enforced

## Mobile auth pages
- [ ] Forms usable at 360px width; video panel collapses
- [ ] Touch targets ≥ 44px; no horizontal scroll
- [ ] Keyboard doesn't obscure submit

## ⭐ Regression block (golden rule + local-first) — RUN EVERY PHASE
- [ ] `/app` loads local projects identically to pre-auth
- [ ] `#/project/<id>` deep link + refresh still works
- [ ] **Reorder scenes → export order matches timeline order**
- [ ] **Move a canvas card → export order UNCHANGED** (only `layout`/`order_index`-untouched)
- [ ] Canvas notes/sections/links export as visual-only (not as scenes)
- [ ] `toMarkdown / toPromptPack / toShotList / toPlainText` output unchanged for
      a fixture project before vs after cloud round-trip
- [ ] Undo/redo (`canvasHistory`) still works (in-memory)
- [ ] Image add/remove + orphan cleanup still works (local and cloud)
- [ ] `migrate()`/`version` in persist config not regressed (old projects load)

## Build gate
- [ ] `npm run build` (`tsc -b && vite build`) green after every change
