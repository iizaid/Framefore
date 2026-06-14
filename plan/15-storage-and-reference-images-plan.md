# 15 — Storage & Reference Images Plan

How reference images move from the local IndexedDB blob store to Supabase Storage.

## Current local storage ([src/lib/images.ts](../src/lib/images.ts))
- Dedicated IndexedDB store: `createStore("framefore-images","blobs")`.
- `saveImage(file)` → `{ id: nanoid, name, type }`; raw `File` stored under `id`.
- `getImageUrl(id)` → `URL.createObjectURL(blob)`.
- `deleteImage(id)` called on scene/project delete to avoid orphans.
- The project model holds only `SceneImage = { id, name, type }` — **never the
  binary** (see [src/types.ts](../src/types.ts)).

## Target: Supabase Storage bucket `reference-images` (PRIVATE)

### Path convention (drives RLS)
```
reference-images/{user_id}/{project_id}/{scene_id}/{uuid}.{ext}
```
First path segment = `auth.uid()` → storage policies authorize by it (doc 06).

### Metadata table
`scene_assets` (doc 05) holds `storage_path`, `name`, `mime_type`, `size_bytes`,
`position`, `client_image_id`, plus `scene_id/project_id/user_id`. The app
resolves `SceneImage` for the UI from these rows.

## Upload flow (signed-in)
```
user adds image → validate (type/size) → upload to reference-images/{path}
  → insert scene_assets row
  → UI shows it (signed URL)
  → useStore scene.images updated with a SceneImage referencing the asset
```

## Reading images
- **Private bucket → use signed URLs**, not public URLs.
- `supabase.storage.from('reference-images').createSignedUrl(path, ttl)`.
- Cache the signed URL in memory until near expiry; regenerate on demand.
- Object URLs are no longer created from local blobs when signed-in (cloud is
  truth); local-only mode keeps using `getImageUrl`.

### Signed vs public URLs
| | Signed | Public |
|---|---|---|
| Privacy | per-request, expiring | anyone with link |
| Use | **user reference images** | n/a (don't expose private content) |

Use **signed** for all user content.

## File constraints
| Constraint | Value (proposed) |
|---|---|
| Max size | 10 MB per image (configurable in bucket) |
| Accepted MIME | `image/png`, `image/jpeg`, `image/webp`, `image/gif` |
| SVG | **disallow** (script vector) or serve as attachment only (doc 14) |
| Object name | server-generated uuid (don't trust user filename) |

Validate both client-side (fast UX) and via bucket settings (authoritative).

## Deleting images
- On scene/project delete: delete `scene_assets` rows AND the Storage objects.
- Mirror local `deleteImage`: cloud delete must remove the binary too, or it
  becomes an orphan billing cost.
- Cascade: `scene_assets` rows cascade on scene delete (FK), but **Storage
  objects do not auto-delete** — handle explicitly in app code or an Edge
  Function cleanup job (doc 16).

## Orphaned file cleanup
- Possible orphans: upload succeeded but metadata insert failed, or app crashed
  mid-delete.
- Strategy: periodic Edge Function that lists bucket objects under a user and
  deletes any with no matching `scene_assets.storage_path`. Run rarely; log
  results. (Future — doc 16.)

## Migration from IndexedDB → Storage (per doc 08)
```
for each SceneImage img in a migrating scene:
  blob = idb get(img.id, framefore-images)
  if !blob: record broken-ref, skip
  path = `${user_id}/${cloudProject.id}/${cloudScene.id}/${uuid()}.${ext(img.type)}`
  storage.upload('reference-images', path, blob, { contentType: img.type })
  insert scene_assets { ..., client_image_id: img.id, storage_path: path }
```
- Keep `client_image_id` so re-runs are idempotent (don't re-upload).
- Local blobs are **not deleted** by migration.

## Cost & storage considerations
- Images dominate storage cost vs text rows. Enforce size limits.
- Consider client-side downscale/compress before upload (e.g. max 2048px) to cut
  cost and speed signed-URL loads — optional enhancement.
- Track `size_bytes` in `scene_assets` to compute per-user usage for future
  quotas/plans.

## RLS / storage policies
See [06](06-row-level-security-rls-plan.md): select/insert/delete on
`storage.objects` gated by `bucket_id='reference-images'` and
`(storage.foldername(name))[1] = auth.uid()::text`.

## Acceptance criteria
- Upload as User A → file lands under `A/...`; User B cannot read it.
- Signed URL renders the image; expires correctly.
- Delete scene → both metadata row and Storage object gone.
- Migration uploads every local blob exactly once; broken refs reported, not
  fatal.
