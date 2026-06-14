# 08 — Local-to-Cloud Migration Plan

Safely copy existing local-first projects (and their image blobs) into Supabase
the first time a user signs in. **Copy, never move. Never auto-delete local data.**

## Sources to migrate
1. `framefore-state` IndexedDB JSON → `projects` + `scenes` + `canvas_*` rows.
2. `framefore-images` IndexedDB blob store → Supabase Storage `reference-images`
   bucket + `scene_assets` rows.

## Trigger & consent
```
On first authenticated session where local projects exist
  AND user_settings.has_migrated_local == false:
    → show non-blocking prompt:
      "We found N projects saved in this browser. Copy them to your account?"
      [ Copy to my account ]   [ Not now ]   [ Don't ask again ]
```
- Migration is **opt-in**. "Not now" can be re-offered later; "Don't ask again"
  sets a local flag.
- Never run automatically without consent.

## Safety: backup before migration
- Before any upload, write a JSON export of all local projects to a downloadable
  backup (reuse `toJSON` per project, or a combined dump) and/or a timestamped
  IndexedDB key `framefore-backup-<ts>`.
- Surface a "Download backup" button. The local store is **not** modified.

## Algorithm (two-pass, idempotent)

```
for each local project P:
  if a cloud project exists with (user_id, client_id == P.id):  # idempotency
     skip or update-in-place (no duplicate)
  else:
     # PASS 1 — insert parents, build id maps
     cloudProject = insert projects { user_id, client_id: P.id, ...fields, global }
     sceneIdMap   = {}
     for i, S in enumerate(P.scenes):
        cloudScene = insert scenes {
           project_id: cloudProject.id, user_id,
           client_id: S.id, order_index: i, ...fields,
           craft, notes_bag, layout
        }
        sceneIdMap[S.id] = cloudScene.id
        # images
        for pos, img in enumerate(S.images):
           blob = idb get(img.id) from framefore-images
           path = `${user_id}/${cloudProject.id}/${cloudScene.id}/${uuid()}`
           storage.upload('reference-images', path, blob)
           insert scene_assets {
             scene_id: cloudScene.id, project_id, user_id,
             client_image_id: img.id, storage_path: path,
             name: img.name, mime_type: img.type, position: pos
           }
     noteIdMap, sectionIdMap = insert canvas_notes / canvas_sections (carry client_id)
     # PASS 2 — links, resolving client ids → cloud ids
     for L in P.links:        insert scene_links  using sceneIdMap
     for L in P.canvasLinks:  insert canvas_links using sceneIdMap/noteIdMap/sectionIdMap
  mark P migrated locally (e.g. localMigratedIds.add(P.id))
set user_settings.has_migrated_local = true
```

### Why two passes
Links reference other entities by id. Insert all nodes first, capture
`client_id → cloud id` maps, then insert links with resolved ids. This mirrors
how `duplicateProject` in [useStore](../src/store/useStore.ts) already remaps ids
via `sceneIdMap`/`noteIdMap`/`sectionIdMap` — reuse that mental model.

## Idempotency / avoiding duplicates
- `client_id` columns + unique `(user_id, client_id)` on `projects` and
  `(project_id, client_id)` on `scenes` (doc 05) make re-running safe:
  upsert on conflict instead of insert.
- A local `migratedProjectIds` set prevents re-uploading already-migrated
  projects even before hitting the DB.

## Partial failure handling
- Migrate **one project at a time**, each as its own logical unit. If project K
  fails midway:
  - Mark K as "incomplete" locally; leave already-inserted rows (idempotent
    re-run will upsert and fill gaps).
  - Continue with project K+1 (don't abort the whole batch).
- Per-image upload failure: record the asset as "pending"; the scene still
  migrates; retry images later.
- Show a results summary: "8 of 9 projects copied. 1 needs retry."

## Retry
- A "Retry migration" action re-runs the algorithm; idempotency keys prevent
  duplicates and fill only the missing rows/assets.

## Local fallback if cloud sync fails
- If the user can't reach Supabase, the app keeps working on local data
  unchanged. Migration is simply deferred; nothing is lost.

## Post-migration behavior
- Cloud becomes source of truth for migrated projects (doc 07).
- Local copies remain as cache. **Do not delete them automatically.** Offer an
  explicit, clearly-worded "Remove local copies (cloud backup confirmed)" action
  only after verifying the cloud rows exist.

## Edge cases
| Case | Handling |
|---|---|
| Image blob missing for an id | Skip that asset, keep `SceneImage` name as a broken-ref note; log it |
| Empty project (no scenes) | Migrate project row only |
| Duplicate run after success | `(user_id, client_id)` unique → upsert, no dupes |
| User signs in on device with no local projects | Nothing to migrate; just fetch cloud |
| Very large project / many images | Chunk uploads; show progress; allow resume |

## Acceptance criteria
- After "Copy to my account", every local project appears in the cloud with
  identical scene order and all images viewable from Storage.
- Local IndexedDB is unchanged (verified: project count + image count identical).
- Re-running migration creates **zero** duplicates.
- Export of a migrated-then-reloaded project byte-matches the pre-migration
  export (order preserved).
