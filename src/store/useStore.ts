import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";
import { nanoid } from "nanoid";
import type { Project, Scene, Direction, SceneLink } from "@/types";
import { emptyGlobal } from "@/types";
import { deleteImage } from "@/lib/images";

// Persist the JSON state into IndexedDB (not localStorage) so we never hit the
// ~5MB cap as projects grow. Image blobs are stored separately (lib/images.ts).
const idbStorage: StateStorage = {
  getItem: async (name) => (await idbGet(name)) ?? null,
  setItem: async (name, value) => {
    await idbSet(name, value);
  },
  removeItem: async (name) => {
    await idbDel(name);
  },
};

export function makeScene(index: number): Scene {
  return {
    id: nanoid(),
    title: "",
    subjectName: "",
    summary: "",
    durationSec: 10,
    status: "Idea",
    role: "none",
    color: "none",
    visualPrompt: "",
    negativePrompt: "",
    cameraAngle: "",
    cameraMovement: "",
    mood: "",
    lighting: "",
    visualStyle: "",
    characterNotes: "",
    locationNotes: "",
    motionNotes: "",
    sfxNotes: "",
    musicNotes: "",
    notes: "",
    imageModel: "",
    videoModel: "",
    narrationPart: "",
    transitionToNext: "",
    continuityNotes: "",
    endingBeat: "",
    images: [],
    collapsed: index > 0, // first scene opens expanded, rest collapsed
    promptDir: "ltr",
    narrationDir: "ltr",
  };
}

function makeProject(partial: Partial<Project>): Project {
  const now = Date.now();
  return {
    id: nanoid(),
    title: partial.title?.trim() || "Untitled Project",
    description: partial.description ?? "",
    topic: partial.topic ?? "",
    platform: partial.platform ?? "YouTube",
    aspectRatio: partial.aspectRatio ?? "16:9",
    targetLengthSec: partial.targetLengthSec ?? 0,
    visualStyle: partial.visualStyle ?? "",
    mood: partial.mood ?? "",
    defaultImageModel: partial.defaultImageModel ?? "",
    defaultVideoModel: partial.defaultVideoModel ?? "",
    global: emptyGlobal(),
    narration: "",
    scenes: [],
    links: [],
    createdAt: now,
    updatedAt: now,
  };
}

interface StoreState {
  projects: Project[];
  hydrated: boolean;

  createProject: (partial: Partial<Project>) => string;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => string | null;
  getProject: (id: string) => Project | undefined;

  addScene: (projectId: string, atIndex?: number) => void;
  updateScene: (projectId: string, sceneId: string, patch: Partial<Scene>) => void;
  deleteScene: (projectId: string, sceneId: string) => void;
  duplicateScene: (projectId: string, sceneId: string) => void;
  reorderScenes: (projectId: string, fromId: string, toId: string) => void;
  setSceneDir: (projectId: string, sceneId: string, field: "promptDir" | "narrationDir", dir: Direction) => void;

  // Canvas (visual layout only — never touches video order).
  setSceneLayout: (projectId: string, sceneId: string, x: number, y: number) => void;
  arrangeScenes: (projectId: string, axis: "vertical" | "horizontal") => void;
  resetLayout: (projectId: string) => void;

  // Manual canvas connections (visual workflow links only).
  addLink: (projectId: string, fromSceneId: string, toSceneId: string) => void;
  updateLink: (projectId: string, linkId: string, patch: Partial<SceneLink>) => void;
  deleteLink: (projectId: string, linkId: string) => void;
}

// Canvas layout geometry shared by auto-arrange + the canvas fallback placement,
// so a scene with no saved position lands exactly where auto-arrange would put it.
export const CANVAS_CARD_W = 264;
export const CANVAS_CARD_H = 188;
const CANVAS_GAP_X = 80;
const CANVAS_GAP_Y = 60;
const CANVAS_ORIGIN = 48;

// Deterministic position for a scene at a given index in either arrangement.
export function defaultSceneLayout(index: number, axis: "vertical" | "horizontal" = "vertical") {
  return axis === "horizontal"
    ? { x: CANVAS_ORIGIN + index * (CANVAS_CARD_W + CANVAS_GAP_X), y: CANVAS_ORIGIN }
    : { x: CANVAS_ORIGIN, y: CANVAS_ORIGIN + index * (CANVAS_CARD_H + CANVAS_GAP_Y) };
}

function touch(p: Project): Project {
  return { ...p, updatedAt: Date.now() };
}

export const useStore = create<StoreState>()(
  persist(
    (set, getState) => ({
      projects: [],
      hydrated: false,

      createProject: (partial) => {
        const project = makeProject(partial);
        set((s) => ({ projects: [project, ...s.projects] }));
        return project.id;
      },

      updateProject: (id, patch) =>
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? touch({ ...p, ...patch }) : p)),
        })),

      deleteProject: (id) => {
        const project = getState().projects.find((p) => p.id === id);
        // Clean up orphaned image blobs.
        project?.scenes.forEach((sc) => sc.images.forEach((img) => void deleteImage(img.id)));
        set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }));
      },

      duplicateProject: (id) => {
        const original = getState().projects.find((p) => p.id === id);
        if (!original) return null;
        const now = Date.now();
        const copy: Project = {
          ...structuredClone(original),
          id: nanoid(),
          title: `${original.title} (Copy)`,
          createdAt: now,
          updatedAt: now,
          // New scene ids; images are shared by reference (blobs aren't copied).
          scenes: original.scenes.map((sc) => ({ ...sc, id: nanoid() })),
        };
        set((s) => ({ projects: [copy, ...s.projects] }));
        return copy.id;
      },

      getProject: (id) => getState().projects.find((p) => p.id === id),

      addScene: (projectId, atIndex) =>
        set((s) => ({
          projects: s.projects.map((p) => {
            if (p.id !== projectId) return p;
            const scene = makeScene(p.scenes.length);
            scene.collapsed = false;
            const scenes = [...p.scenes];
            scenes.splice(atIndex ?? scenes.length, 0, scene);
            return touch({ ...p, scenes });
          }),
        })),

      updateScene: (projectId, sceneId, patch) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? touch({
                  ...p,
                  scenes: p.scenes.map((sc) => (sc.id === sceneId ? { ...sc, ...patch } : sc)),
                })
              : p,
          ),
        })),

      deleteScene: (projectId, sceneId) => {
        const project = getState().projects.find((p) => p.id === projectId);
        const scene = project?.scenes.find((sc) => sc.id === sceneId);
        scene?.images.forEach((img) => void deleteImage(img.id));
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? touch({ ...p, scenes: p.scenes.filter((sc) => sc.id !== sceneId) })
              : p,
          ),
        }));
      },

      duplicateScene: (projectId, sceneId) =>
        set((s) => ({
          projects: s.projects.map((p) => {
            if (p.id !== projectId) return p;
            const idx = p.scenes.findIndex((sc) => sc.id === sceneId);
            if (idx === -1) return p;
            const src = p.scenes[idx];
            const copy: Scene = {
              ...structuredClone(src),
              id: nanoid(),
              title: src.title ? `${src.title} (Copy)` : "",
              collapsed: false,
            };
            const scenes = [...p.scenes];
            scenes.splice(idx + 1, 0, copy);
            return touch({ ...p, scenes });
          }),
        })),

      reorderScenes: (projectId, fromId, toId) =>
        set((s) => ({
          projects: s.projects.map((p) => {
            if (p.id !== projectId) return p;
            const from = p.scenes.findIndex((sc) => sc.id === fromId);
            const to = p.scenes.findIndex((sc) => sc.id === toId);
            if (from === -1 || to === -1 || from === to) return p;
            const scenes = [...p.scenes];
            const [moved] = scenes.splice(from, 1);
            scenes.splice(to, 0, moved);
            return touch({ ...p, scenes });
          }),
        })),

      setSceneDir: (projectId, sceneId, field, dir) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  scenes: p.scenes.map((sc) => (sc.id === sceneId ? { ...sc, [field]: dir } : sc)),
                }
              : p,
          ),
        })),

      // Persist a single card's canvas position. Video order is untouched.
      setSceneLayout: (projectId, sceneId, x, y) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? touch({
                  ...p,
                  scenes: p.scenes.map((sc) => (sc.id === sceneId ? { ...sc, layout: { x, y } } : sc)),
                })
              : p,
          ),
        })),

      // Snap every card into a clean line following the current video order.
      arrangeScenes: (projectId, axis) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? touch({
                  ...p,
                  scenes: p.scenes.map((sc, i) => ({ ...sc, layout: defaultSceneLayout(i, axis) })),
                })
              : p,
          ),
        })),

      // Clear saved positions; the canvas falls back to a default vertical line.
      resetLayout: (projectId) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? touch({ ...p, scenes: p.scenes.map((sc) => ({ ...sc, layout: undefined })) })
              : p,
          ),
        })),

      // Create a manual visual link. Skips self-links and exact duplicates so the
      // graph stays clean. Does NOT touch scene order or transitionToNext.
      addLink: (projectId, fromSceneId, toSceneId) =>
        set((s) => ({
          projects: s.projects.map((p) => {
            if (p.id !== projectId) return p;
            if (fromSceneId === toSceneId) return p;
            const links = p.links ?? [];
            if (links.some((l) => l.fromSceneId === fromSceneId && l.toSceneId === toSceneId)) return p;
            const link: SceneLink = { id: nanoid(), fromSceneId, toSceneId };
            return touch({ ...p, links: [...links, link] });
          }),
        })),

      // Patch a manual link's label/type. Used by the canvas edge toolbar. Never
      // touches scene order — links are visual workflow annotations only.
      updateLink: (projectId, linkId, patch) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? touch({
                  ...p,
                  links: (p.links ?? []).map((l) => (l.id === linkId ? { ...l, ...patch } : l)),
                })
              : p,
          ),
        })),

      deleteLink: (projectId, linkId) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId ? touch({ ...p, links: (p.links ?? []).filter((l) => l.id !== linkId) }) : p,
          ),
        })),
    }),
    {
      name: "framefore-state",
      version: 6,
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({ projects: s.projects }) as StoreState,
      // Backfill fields added after v1 so older saved projects keep working.
      migrate: (persisted: unknown, _version: number) => {
        const state = persisted as { projects?: Project[] } | undefined;
        if (state?.projects) {
          // Old persisted projects/scenes lack newer keys; the ?? fallbacks fill
          // them in at runtime while keeping any value that already exists.
          state.projects = state.projects.map((p) => ({
            ...p,
            // v5: project-level default models (scenes inherit when empty).
            defaultImageModel: p.defaultImageModel ?? "",
            defaultVideoModel: p.defaultVideoModel ?? "",
            // v6: manual canvas links (visual only).
            links: p.links ?? [],
            scenes: (p.scenes ?? []).map((sc) => ({
              ...sc,
              role: sc.role ?? "none",
              subjectName: sc.subjectName ?? "",
              imageModel: sc.imageModel ?? "",
              videoModel: sc.videoModel ?? "",
              transitionToNext: sc.transitionToNext ?? "",
              continuityNotes: sc.continuityNotes ?? "",
              endingBeat: sc.endingBeat ?? "",
            })),
          }));
        }
        return state as StoreState;
      },
      // Runs after rehydration finishes (success OR failure). We must use
      // setState here — mutating the `state` arg directly does NOT notify React
      // subscribers, which would leave the app stuck on the loading screen.
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.error("[Framefore] Failed to rehydrate persisted state:", error);
        }
        // Either way, mark hydration complete so the UI renders. If hydration
        // failed, the user simply starts from an empty (in-memory) board.
        useStore.setState({ hydrated: true });
      },
    },
  ),
);
