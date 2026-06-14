# 🎬 Framefore

A local-first creative planning board for AI video production. Turn a video idea into a
structured, scene-by-scene production plan — write prompts, attach references, balance
narration, and export clean prompt packs for tools like Runway, Kling, or Sora.

No backend. No auth. No cloud. Everything lives in your browser (IndexedDB).

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production bundle to dist/
```

## Stack

- **React 18 + Vite + TypeScript** — fast, static, no server needed
- **Tailwind CSS v4** — cinematic dark design system (tokens in `src/index.css`)
- **Zustand** + IndexedDB (`idb-keyval`) — persisted state with autosave on every edit
- **Framer Motion** — smooth board interactions
- **@dnd-kit** — drag-to-reorder scenes
- **lucide-react** — icons

## How it's organized

| Path | Responsibility |
|------|----------------|
| `src/types.ts` | Domain model (Project → Scene → images) |
| `src/store/useStore.ts` | All state mutations; persisted to IndexedDB |
| `src/lib/estimate.ts` | Duration math (WPM-based narration timing, balance checks) |
| `src/lib/readiness.ts` | Production-readiness scoring — **tune the checks to your workflow** |
| `src/lib/export.ts` | Markdown / JSON / text / prompt-pack / shot-list builders |
| `src/lib/images.ts` | Image blobs in a separate IndexedDB store (never base64 in JSON) |
| `src/components/` | UI — `ProjectsPage`, `Workspace` (board), `SceneCard`, side panels |

## Persistence model

Project & scene **metadata** (JSON) is persisted via Zustand's `persist` middleware into
IndexedDB under `framefore-state`. Reference **images** are stored as blobs in a separate
IndexedDB store (`framefore-images`) and resolved to object URLs on demand — this keeps the
JSON state small and dodges the ~5 MB localStorage ceiling.

## Tuning readiness scoring

`src/lib/readiness.ts` defines what "ready to generate" means as a weighted checklist
(`SCENE_CHECKS`). Adjust the weights or add/remove checks to match how *you* work — e.g. bump
the `images` weight if references matter most, or drop the `negative` check if you don't use them.

## Notes / future-proofing

- Narration timing uses a configurable `WORDS_PER_MINUTE` (default 150). No AI is involved —
  the architecture leaves room to make AI estimation an *optional* enhancement later.
- The data model is plain JSON, so a future cloud sync or export/import is straightforward.
