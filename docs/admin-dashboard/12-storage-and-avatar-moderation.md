# 12 — Storage & Avatar Moderation

## Buckets (both private)

| Bucket | Migration | Limit | MIME | Path convention |
|---|---|---|---|---|
| `avatars` | [0008](../../supabase/migrations/0008_profile_account_fields_and_avatars.sql) | 2 MB | png/jpeg/webp/gif (**SVG excluded**) | `<user_id>/avatar/<file>` |
| `reference-images` | [0004](../../supabase/migrations/0004_reference_images_storage.sql) | 10 MB | png/jpeg/webp/gif (**SVG excluded**) | `<user_id>/<project_id>/<scene_id>/<uuid>.<ext>` |

Both are **private**. Display is only ever via short-lived **signed URLs**
(`createSignedUrl`), never public URLs, never the service-role key in the client.
RLS keys on the first path segment = `auth.uid()` (plus project ownership on
write paths for reference-images).

## Storage metadata sources

- **Avatars (now):** `profiles.avatar_path` is the source of truth for whether a
  user has an uploaded avatar; the file lives in the `avatars` bucket. Admin can
  count `avatar_path IS NOT NULL` and, with care, view a specific avatar via a
  signed URL minted through an Edge function (admins can't read other users'
  storage with the anon client — RLS scopes to the owner).
- **Reference images (after cloud sync):** `scene_assets` holds metadata
  (`storage_path`, `mime_type`, `size_bytes`, `position`). Footprint =
  `sum(size_bytes)`. Empty until sync.

## Admin viewing limitations (important)

The anon client (even as admin) can **only** read storage objects under
`auth.uid()` — the Storage RLS policies are owner-scoped and have **no admin
exception**. So to view *another user's* avatar/reference image, an admin must go
through an **Edge function** that:
1. verifies the caller is admin,
2. mints a short-TTL signed URL for the specific object with the service role,
3. writes an `admin_audit_events` row (`action='viewed_storage_object'`,
   `metadata={path}`) — viewing user content is an audited event.

Do **not** add a broad admin SELECT policy on `storage.objects`; it would leak
all user files and is hard to scope. Keep access narrow + logged.

## Storage overview page (`/admin/storage`)

```
┌ Storage ───────────────────────────────────────────────┐
│ Avatars:    540 uploaded  ·  ~410 MB (est.)            │  ← profiles + Edge fn totals
│ Reference images:  — available after cloud sync —      │
│                                                        │
│ Orphan check:  [Run]  (Edge fn, owner/admin)           │
└────────────────────────────────────────────────────────┘
```

## Orphan cleanup plan

Storage objects do **not** cascade when a DB row is deleted (the migrations call
this out). So orphans accumulate:
- **Avatars:** `uploadAvatar` already best-effort deletes the previous file
  ([lib/profile.ts](../../src/lib/profile.ts)), but failures leave orphans.
- **Reference images:** after a project/scene delete, objects must be removed by
  the app or a job.

**Plan:** an `admin-storage-cleanup` Edge function (service role, owner/admin,
audited) that:
1. lists objects per user prefix,
2. cross-references `profiles.avatar_path` / `scene_assets.storage_path`,
3. deletes only objects with no DB reference older than a grace window,
4. logs counts to `admin_audit_events`.
MVP: read-only **report** of suspected orphans; deletion is a deliberate,
confirmed, owner/admin action (future).

## Abuse detection

- Oversized/unexpected uploads are already bounded by bucket limits + the
  `scene_assets` CHECK (`size_bytes <= 10 MB`) and the avatar CHECKs. SVG is
  rejected at the bucket and `scene_assets_mime_image` check (script-vector
  defense).
- Future: an Edge upload guard can record `rate_limit_events` for
  high-frequency/large uploads ([11](11-rate-limit-and-abuse-monitoring.md)).

## File size / MIME / SVG rules (already enforced — surface, don't re-add)

- Avatars: ≤ 2 MB, raster only; `validateAvatarFile()` mirrors the bucket rules
  client-side for fast errors.
- Reference images: ≤ 10 MB, raster only.
- **SVG is rejected everywhere** (bucket allow-list + DB check) because it can
  embed script and must never render as an inline image.

## Moderation (future)

Content moderation (flagging inappropriate avatars/reference images) is a future
capability: a `reviewer`-oriented queue backed by an Edge function that mints
signed URLs on demand (audited), with actions (approve/remove) that are
owner/admin + logged. Not MVP.

## Acceptance criteria

- No admin can view another user's storage object without going through the
  audited Edge-fn path.
- Storage page shows real avatar counts; reference-image section is an honest
  "after cloud sync" state.
- No public bucket, no service-role key in the client, SVG stays rejected.
- Orphan cleanup is report-only in MVP; deletion is confirmed + audited.
