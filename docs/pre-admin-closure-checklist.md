# Pre-Admin Closure Checklist

Current checkpoint: Framefore has Supabase Auth/Profile foundations, but `/app`
remains local-first. This sprint closes profile, avatar, account menu, loading,
and handoff gaps before any real Admin Dashboard work begins.

## Already Completed

- [x] Supabase Auth UI exists for login, signup, OAuth callback, and password reset.
- [x] Google OAuth works when configured in Supabase.
- [x] GitHub OAuth is wired in code; dashboard/provider configuration may still be pending.
- [x] `/profile` exists and loads the current user's profile row.
- [x] Avatar display priority is implemented: uploaded `avatar_path` -> OAuth `avatar_url` -> initials.
- [x] Avatar upload/remove uses the private `avatars` bucket and signed display URLs.
- [x] `/app` remains local-first and is not auth-gated.
- [x] Local projects are account-scoped in IndexedDB using `ownerUserId` / store version 9.
- [x] Guest project import into an account is explicit and non-destructive.
- [x] Timeline order remains `project.scenes` order.
- [x] Canvas layout and relationships remain visual planning data only.

## Fixed In This Sprint

- [x] `/profile` uses a clean settings header: "Profile settings".
- [x] Removed duplicated profile/avatar hero treatment from loading/profile chrome.
- [x] Profile sections are grouped as avatar/identity, contact/location, and sign-in/security.
- [x] Account menu dropdown contains only useful actions: Profile and Sign out.
- [x] Avatar change flow opens a crop editor instead of direct-uploading the selected source file.
- [x] Avatar editor supports file selection, drag/reposition, zoom, circular preview, reset, cancel, and save.
- [x] Cropped avatars are processed client-side and uploaded as a bounded WebP file.
- [x] User-facing auth/profile unavailable copy avoids exposing environment variable names.
- [x] Profile updates ignore accidental `undefined` fields instead of clearing data.
- [x] Global loading is intentionally scoped: landing splash once per session, compact route/workspace fallbacks.
- [x] A local OAuth client secret file was removed from `public/` serving scope.

## Must Remain For Admin Dashboard Phase

- [ ] Build a real `/admin` UI only after role checks and product requirements are finalized.
- [ ] Add a frontend admin-role helper backed by Supabase role functions.
- [ ] Gate `/admin` with a real role guard; do not rely on frontend-only checks for security.
- [ ] Define dashboard sections: users, roles, audit events, support tools, and operational health.
- [ ] Decide which admin actions need Edge Functions and audit logging.
- [ ] Keep user-content admin access narrow and explicit; do not add broad RLS admin read policies casually.

## Must Remain For Cloud Project Sync Phase

- [ ] Do not migrate local projects automatically.
- [ ] Implement a cloud repository layer separately from the local IndexedDB store.
- [ ] Add explicit local-to-cloud import/migration UI and conflict handling.
- [ ] Upload reference image blobs through a secure storage flow.
- [ ] Preserve local-first fallback when cloud sync fails or is unavailable.
- [ ] Verify export still walks `project.scenes` in timeline order after sync is introduced.

## Risks And Constraints

- [ ] Do not protect `/app` until cloud sync and migration UX are ready.
- [ ] Do not delete or migrate local projects without an explicit user action.
- [ ] Do not modify already-applied migrations; add a new migration if a database change is required.
- [ ] Do not place provider secrets, service-role keys, or client secret JSON files in `public/`.
- [ ] Keep service-role secrets out of all frontend and `VITE_*` variables.
- [ ] Keep the golden rule: Timeline = video order; Canvas = visual planning only.

## Manual QA Checklist

- [ ] `/` loads and the large splash does not repeat aggressively in the same tab session.
- [ ] `/login` shows concise, non-technical errors.
- [ ] `/signup` shows concise, non-technical errors.
- [ ] `/reset-password` handles valid and expired links cleanly.
- [ ] `/profile` signed out redirects to `/login` when Supabase is configured.
- [ ] `/profile` signed in loads profile details and avatar.
- [ ] Avatar change opens the crop editor.
- [ ] Invalid avatar files show clear errors and do not crash.
- [ ] Avatar crop drag, zoom, reset, cancel, and save work on desktop and mobile.
- [ ] Avatar remove clears uploaded avatar and falls back to OAuth avatar or initials.
- [ ] AccountMenu shows account identity, Profile, and Sign out only.
- [ ] `/app` opens without requiring sign-in.
- [ ] Project list respects guest/account local isolation.
- [ ] Import local projects banner still works when signed in with guest projects present.
- [ ] Direct `/app#/project/<id>` guard blocks projects outside the current owner context.
- [ ] Timeline reorder still updates `project.scenes`.
- [ ] Canvas positions do not affect export order.
- [ ] Export uses `project.scenes` order.
- [ ] Mobile profile page and avatar crop modal fit the viewport.
- [ ] `npm run build` passes.

