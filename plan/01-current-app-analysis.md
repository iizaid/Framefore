# 01 — Current App Analysis (read before planning)

Everything below was read directly from the codebase, not assumed.

## 1. Routes (React Router, [src/App.tsx](../src/App.tsx))

| Path | Element | Notes |
|---|---|---|
| `/` | `LandingPage` | Public marketing page |
| `/app` | `AppWorkspacePage` | The workspace — **local-first, ungated today** |
| `/login` | `LoginPage` | Placeholder shell, no auth wired |
| `/signup` | `SignupPage` | Placeholder shell, no auth wired |
| `/admin` | `AdminPage` | Placeholder, no role guard |
| `/pricing` | `Navigate → /#pricing` | Redirect to landing section |
| `*` | `Navigate → /` | Catch-all |

There is a deliberate comment in `App.tsx`: *Phase 4.3 will add a
`<ProtectedRoute>` wrapper around `/app` and `/admin`… For now `/app` remains
open so local projects are never disrupted.*

### Nested router inside `/app`
[src/pages/AppWorkspacePage.tsx](../src/pages/AppWorkspacePage.tsx) keeps a
**second, hash-based router** (`#/project/<id>`). Pathname and hash are
independent: `/app#/project/<id>` deep-links into an open project across
refresh. **Do not replace this** — it is how the workspace preserves its
pre-routing behavior. Any auth redirect logic must not clobber the hash.

## 2. Local storage approach

Two distinct IndexedDB stores:

| Store | Mechanism | Key | Contents |
|---|---|---|---|
| `framefore-state` | Zustand `persist` + `idb-keyval` (`createJSONStorage`) | `framefore-state` | Full projects array as JSON |
| `framefore-images` | `idb-keyval` `createStore("framefore-images","blobs")` | nanoid per image | Raw `File`/`Blob` binaries |

Key facts:
- `partialize: (s) => ({ projects: s.projects })` — only `projects` is
  persisted; `hydrated` and `canvasHistory` are in-memory only.
- `version: 8` with a `migrate()` that backfills new fields on old projects.
- `onRehydrateStorage` sets `hydrated: true` even on error, so the UI never
  hangs — a failed rehydrate just yields an empty in-memory board.
- Image binaries are **never** in the JSON; `Scene.images[]` holds only
  `{ id, name, type }`. The `id` is the IndexedDB blob key.

**Migration implication:** uploading project JSON alone is insufficient — the
blobs in `framefore-images` must be uploaded separately and the `SceneImage.id`
remapped to a Storage path. See [15](15-storage-and-reference-images-plan.md).

## 3. Zustand store structure ([src/store/useStore.ts](../src/store/useStore.ts))

State shape:
```ts
{
  projects: Project[];        // persisted
  hydrated: boolean;          // in-memory
  canvasHistory: Record<string, { past: Snapshot[]; future: Snapshot[] }>; // in-memory undo/redo
}
```

Action groups:
- **Project CRUD:** `createProject`, `updateProject`, `deleteProject`,
  `duplicateProject`, `getProject`.
- **Scene CRUD + order:** `addScene`, `updateScene`, `deleteScene`,
  `duplicateScene`, `reorderScenes`, `setSceneDir`.
- **Canvas (visual only):** `addCanvasScene`, `setSceneLayout`, `arrangeScenes`,
  `resetLayout`, `undoCanvas`, `redoCanvas`.
- **Links/notes/sections (visual only):** `addLink`, `updateLink`, `deleteLink`,
  `addCanvasLink`, `updateCanvasLink`, `deleteCanvasLink`, `addCanvasNote`,
  `updateCanvasNote`, `deleteCanvasNote`, `addCanvasSection`,
  `updateCanvasSection`, `deleteCanvasSection`.

Every mutating action calls `touch(p)` which sets `updatedAt: Date.now()`. This
timestamp is the natural hook for last-write-wins sync (see
[09](09-project-sync-strategy.md)).

`deleteProject` / `deleteScene` proactively call `deleteImage(img.id)` to clean
orphaned blobs — the cloud equivalent must clean Storage objects too.

## 4. `Project` type ([src/types.ts](../src/types.ts))

```ts
interface Project {
  id: string;            // nanoid
  title, description, topic: string;
  platform: Platform;    // "YouTube" | "Reels" | "TikTok" | "Shorts" | "Other"
  aspectRatio: AspectRatio; // "16:9" | "9:16" | "1:1"
  targetLengthSec: number;  // 0 = unset
  visualStyle, mood: string;
  defaultImageModel, defaultVideoModel: string; // scenes inherit when ""
  global: GlobalSettings;   // 9 creative-direction string fields
  narration: string;        // full script
  scenes: Scene[];          // ORDERED — this is the timeline / export order
  links?: SceneLink[];          // visual canvas connections
  canvasLinks?: CanvasLink[];   // visual cross-node relationships
  canvasNotes?: CanvasNote[];   // visual sticky notes
  canvasSections?: CanvasSection[]; // visual story frames
  createdAt, updatedAt: number; // epoch ms
}
```

`GlobalSettings`: `visualStyle, cameraStyle, mood, colorPalette, mainCharacter,
mainLocation, negativePrompt, targetToolNotes, outputFormatNotes` (all strings).

## 5. `Scene` type

~35 fields, all JSON-serializable. Notable:
- Identity/meta: `id, title, subjectName, summary, durationSec, status, role,
  tag?, color`.
- Prompts: `visualPrompt, negativePrompt`.
- Craft: `cameraAngle, cameraMovement, mood, lighting, visualStyle`.
- Notes: `characterNotes, locationNotes, motionNotes, sfxNotes, musicNotes,
  notes`.
- Models/flow: `imageModel, videoModel, narrationPart, transitionToNext,
  continuityNotes, endingBeat`.
- `images: SceneImage[]` where `SceneImage = { id, name, type }` (id → blob key).
- `layout?: SceneLayout` `{ x, y }` — **canvas position, NOT order**.
- UI: `collapsed?, promptDir, narrationDir`.

Supporting canvas types: `SceneLink`, `CanvasLink` (typed cross-node edges),
`CanvasNote` (`{id,x,y,text,kind?,createdAt?,updatedAt?}`), `CanvasSection`
(`{id,title,x,y,width,height,type?,...}`).

## 6. Canvas / Timeline / Export dependencies (the golden rule)

From [src/lib/export.ts](../src/lib/export.ts):
- `toMarkdown`, `toPromptPack`, `toShotList`, `toPlainText`, `sceneListOnly`,
  `narrationOnly` **all iterate `project.scenes` in array order**.
- Canvas notes attach to a scene **only via a `CanvasLink`** (`notesForScene`),
  never by geometry. Section membership uses bounding-box overlap
  (`sceneOverlapsSection`) but only for a *display* "Story Sections" block — it
  never reorders scenes.
- Explicit in-code banner: *"Export always walks `project.scenes` in array
  order, so canvas positions can NEVER change the exported video order."*

**Schema rule that follows:** scenes must be stored with a stable, explicit
order (`order_index int`) so the array order is reconstructed losslessly. See
[05](05-database-schema-plan.md).

## 7. Existing auth scaffolding (already present, inert)

| File | State |
|---|---|
| [src/lib/supabase.ts](../src/lib/supabase.ts) | Creates client only if both env vars set, else `null`; exports `isSupabaseConfigured`. |
| [src/store/useAuthStore.ts](../src/store/useAuthStore.ts) | Full auth store: `init`, `signIn`, `signUp`, `signOut`, `signInWithGoogle`, `signInWithGitHub`. Calls `init()` on module load. OAuth `redirectTo` = `${origin}/app`. |
| [src/pages/LoginPage.tsx](../src/pages/LoginPage.tsx), [SignupPage.tsx](../src/pages/SignupPage.tsx) | Use `AuthShell` + disabled `ProviderButtons`; currently just link to `/app`. |
| [src/components/landing/AuthShell.tsx](../src/components/landing/AuthShell.tsx) | Frame + disabled provider buttons. |
| `AuthForm.tsx`, `AuthLayout.tsx`, `AuthVideoPanel.tsx` (untracked) | Newer split-screen scaffolding, not yet wired into the pages. |
| [docs/supabase-auth-setup.md](../docs/supabase-auth-setup.md) | Existing minimal setup doc with a `profiles` table + trigger. |

The auth store is functional but the UI does not call it yet. The `@supabase/supabase-js`
package is **already installed** (package.json line 15).

## 8. Risks to manage before adding auth

| Risk | Why | Mitigation doc |
|---|---|---|
| Breaking scene order in the cloud schema | scenes are an ordered array; a naive table loses order | [05](05-database-schema-plan.md) — `order_index` |
| Losing image blobs in migration | blobs are in a *separate* store, not in JSON | [08](08-local-to-cloud-migration-plan.md), [15](15-storage-and-reference-images-plan.md) |
| Clobbering the `#/project/<id>` hash on auth redirect | nested hash router is independent of pathname | [02](02-auth-requirements.md) redirect rules |
| Double-persistence drift (IndexedDB vs cloud) | both could mutate `updatedAt` | [09](09-project-sync-strategy.md) — single source of truth |
| Auto-`init()` firing before env present | `useAuthStore` runs `init()` at import | already `isSupabaseConfigured`-guarded; keep it |
| Migrating duplicate projects on repeat logins | no idempotency key today | [08](08-local-to-cloud-migration-plan.md) — `migrated`/`cloud_id` marker |

## 9. Files that must NOT be broken

- [src/store/useStore.ts](../src/store/useStore.ts) — persistence + golden rule.
- [src/lib/export.ts](../src/lib/export.ts) — export order.
- [src/lib/images.ts](../src/lib/images.ts) — blob store.
- [src/types.ts](../src/types.ts) — domain model (extend, don't mutate semantics).
- [src/pages/AppWorkspacePage.tsx](../src/pages/AppWorkspacePage.tsx) — hash router.
- `migrate()` / `version` in the persist config — bumping carelessly drops data.
