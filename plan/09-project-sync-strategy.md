# 09 — Project Sync Strategy

How local cache (IndexedDB) and cloud (Postgres) stay aligned for a signed-in
user. Built on the existing `updatedAt` (`touch()`) timestamp.

## MVP strategy: cloud-authoritative, debounced push, last-write-wins
- **Cloud is source of truth** when signed in (doc 07).
- **Local IndexedDB is a cache + offline buffer**, keeping the current Zustand
  persist behavior untouched.
- Writes flow: mutate `useStore` → local persist (as today) → **debounced push**
  to Supabase for dirty entities.
- Reads on load: fetch cloud → reconcile with cache by `updated_at`.

> **No real-time in MVP.** Supabase Realtime is a clearly-scoped future upgrade.

## Autosave debounce
- Debounce window: ~800ms–2000ms after the last mutation per project.
- Flush triggers: debounce timeout, project close/route change, tab `blur`,
  `beforeunload` (best-effort `keepalive`/`sendBeacon`-style).
- Coalesce rapid edits (typing a prompt) into one upsert.
- Per-entity dirty tracking so we push only what changed (project row, changed
  scenes, changed canvas rows), not the whole project.

## Offline behavior
- All mutations succeed locally regardless of connectivity (IndexedDB).
- A pending-changes queue holds unsynced entity ids. On reconnect, flush the
  queue (oldest first), respecting idempotency keys (`client_id`).
- `navigator.onLine` + fetch failure detection toggle an "offline / will sync"
  indicator.

## Conflict model: last-write-wins with detection

```
base_updated_at = updated_at when the project was last loaded/synced
on push:
  read remote.updated_at
  if remote.updated_at <= base_updated_at:
       push local changes; set base_updated_at = new remote.updated_at
  else:  # remote changed elsewhere since we loaded
       CONFLICT
```

### MVP conflict resolution
- **Last-write-wins by `updated_at`** at the **project granularity** for safety
  and simplicity.
- On detected conflict, default to keeping the **newer** `updated_at`. If remote
  is newer, reload remote into the cache and toast: *"This project was updated on
  another device — loaded the latest version."* (Local unsynced edits are
  preserved to a recovery snapshot before reload, so nothing is silently lost.)

### Why project-granularity, not field-level (MVP)
Field-level merge needs per-field timestamps the model doesn't have. The model
*does* have one `updatedAt` per project (and per note/section). Project-level LWW
is correct and shippable; field merge is a future enhancement.

## Avoiding project corruption
- **Never partially overwrite the ordered scene set.** When pushing a reorder or
  bulk change, send the full ordered `order_index` list in a single transaction
  (RPC) so a half-written order can't reverse the golden rule.
- Validate on load: scenes must come back with contiguous-enough `order_index`;
  rebuild the array strictly by `order by order_index`.
- Wrap multi-row writes (project + scenes) in a Postgres function/transaction so
  a network drop can't leave a project half-updated. (Edge/RPC — doc 16.)

## Keeping cache and cloud aligned
- After each successful push, update the local cache's `updated_at`/`base` to the
  server value.
- On app start (signed in): fetch project list with `updated_at`; for each, if
  remote newer than cache → refresh; if cache newer (offline edits) → push.
- A periodic light reconciliation (e.g. on window focus) catches drift.

## What is stored locally after auth
| Data | Local cache | Cloud |
|---|---|---|
| Project JSON (signed-in) | yes (mirror) | yes (truth) |
| Image object URLs | regenerated on demand | binary in Storage |
| Undo/redo (`canvasHistory`) | yes (in-memory only) | no |
| Pending-sync queue | yes | n/a |
| `base_updated_at` per project | yes | n/a |

## What is fetched from Supabase
- Project list + full project on open (reconstructed per doc 05 read path).
- Signed URLs for reference images on demand (doc 15).
- `user_settings` on login.

## Future: realtime sync (out of scope, documented)
- Subscribe to `postgres_changes` on `projects`/`scenes` filtered by `user_id`.
- Apply remote deltas to the cache; show presence/“updated elsewhere” live.
- Requires field-level or CRDT-ish merge to avoid clobbering active edits —
  large effort, explicitly deferred.

## Acceptance criteria
- Edit offline → changes persist locally → reconnect → cloud reflects them with
  no duplicates.
- Two devices editing the same project → newer `updated_at` wins; the other
  device is informed and reloads; no silent data loss (recovery snapshot kept).
- Reorder pushed atomically; never observed in a half-reordered state.
