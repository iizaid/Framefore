# 07 — User Management Plan

## The central constraint

`auth.users` is **not safely readable from the browser**. The anon client can
only see the caller's own `profiles` row (RLS `profiles_select_own`). So an admin
user list cannot come from a plain client query today. There are two valid paths:

1. **Admin-readable `profiles` projection (a DB view + policy/RPC)** — exposes
   only *non-sensitive profile* fields to `is_admin()` callers. Good for: name,
   nickname, bio, avatar status, profile_completed, created_at. **Cannot** expose
   email/last_sign_in (those live in `auth.users`).
2. **Edge Function `admin-list-users` (service role)** — the only safe way to
   read `auth.users` metadata (email, provider, `last_sign_in_at`,
   `email_confirmed_at`). Verifies the caller is admin server-side, returns a
   sanitized list, writes nothing sensitive to the client beyond what's needed.

**MVP recommendation:** start with path 1 (`admin_user_overview` view, see
[14](14-database-views-rpcs-and-migrations.md)) so the list works without Edge
infra. Add path 2's auth fields when the Edge runtime is set up.

## Users list fields

| Field | Source | MVP? |
|---|---|---|
| Display name (`full_name`) | profiles | ✅ |
| Nickname | profiles | ✅ |
| Avatar — initials or external `avatar_url` only (uploaded `avatar_path` not displayable for others without Edge fn) | profiles.avatar_url + status flag | ✅ |
| `profile_completed` | profiles | ✅ |
| Roles | user_roles | ✅ |
| Created at | profiles.created_at | ✅ |
| Email | auth.users | 🧩 Edge fn |
| Provider (google/github/email) | auth.users.identities | 🧩 Edge fn |
| Last sign-in | auth.users.last_sign_in_at | 🧩 Edge fn |
| Email confirmed | auth.users.email_confirmed_at | 🧩 Edge fn |
| Project / scene counts | projects/scenes | 🔮 post cloud sync |
| Storage footprint | scene_assets / avatar | 🔮 / partial |

> **Avatars in the list — important RLS reality.** Storage RLS for the `avatars`
> bucket is **owner-scoped**: an admin **cannot** `createSignedUrl()` for another
> user's uploaded `avatar_path` from the browser
> ([0008](../../supabase/migrations/0008_profile_account_fields_and_avatars.sql)).
> So the `getAvatarDisplayUrl` path in [lib/profile.ts](../../src/lib/profile.ts)
> only works for the *caller's own* avatar — it does **not** generalize to an
> admin list of other users.
>
> **Users-list MVP therefore shows initials and/or the external OAuth
> `avatar_url` only** (a public http(s) URL safe to render). Uploaded
> `avatar_path` images for *other* users are **not** displayable in the browser.
> Viewing another user's uploaded avatar requires the audited
> `admin-view-storage-object` Edge function (service role) that mints a short-TTL
> signed URL and writes an `admin_audit_events` row — see
> [12](12-storage-and-avatar-moderation.md) / [13](13-admin-actions-and-edge-functions.md).
> Do **not** add a broad admin SELECT policy on `storage.objects` to work around
> this.

## User detail page (`/admin/users/:userId`)

Sections:
- **Identity:** avatar, name, nickname, created_at, (Edge fn: email/provider/last
  sign-in/confirmation).
- **Profile metadata:** bio, country, city, timezone, phone (treat phone as
  sensitive — see privacy below).
- **Roles:** current roles + grant/revoke controls (gated, [08](08-role-management-plan.md)).
- **Audit history:** `admin_audit_events where target_user_id = :userId`.
- **Future:** projects, storage, security events for this user, support notes,
  account status.

## Actions

| Action | MVP | Mechanism |
|---|---|---|
| View profile metadata | ✅ | view / Edge fn |
| View roles | ✅ | `user_roles` |
| Grant/revoke allowed roles | ✅ | `grant/revoke_app_role` RPC |
| Send password reset | ❌ (not MVP) | future Edge fn (`auth.admin.generateLink`) — avoids admins triggering emails casually |
| Suspend / ban | ❌ | future Edge fn + `account_status` ([14](14-database-views-rpcs-and-migrations.md)) |
| Delete user | ❌ | future Edge fn (`auth.admin.deleteUser`), owner-only, double-confirm |

## Privacy stance

- **Phone number, full contact details** are personal data. Show them only on the
  detail page (not the list), consider masking by default with a click-to-reveal
  that writes an `admin_audit_events` row (`viewed_pii`). Decision in
  [24](24-open-questions-and-decisions.md).
- **No creative content** (prompts/scripts/images) in the user view — that's
  [09](09-project-visibility-and-support-plan.md)'s justified+logged path only.
- The user-list/detail data layer must mirror `lib/profile.ts`: `Result<T>`,
  session-derived identity, friendly errors, never trust UI-supplied ids for
  authorization (the `:userId` selects *which* row to show, but the *permission*
  to show it is the server-side admin check).

## Acceptance criteria

- Non-admins cannot retrieve any other user's profile (verified: RLS denies, and
  the view/Edge fn checks `is_admin()`).
- List paginates (cursor on `created_at`, see [19](19-search-filter-sort-pagination.md))
  and search works on name/nickname (and email once Edge fn lands).
- Detail page deep-links and handles unknown `:userId` gracefully.
- No `auth.users` field appears until the Edge fn exists (no fake email column).
