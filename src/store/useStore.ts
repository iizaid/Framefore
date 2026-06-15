import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";
import { nanoid } from "nanoid";
import type {
  Project,
  Scene,
  Direction,
  SceneLink,
  CanvasNote,
  CanvasSection,
  CanvasLink,
  CanvasNodeType,
} from "@/types";
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

// Account-scoped local visibility (Phase 4.4.1). A project is visible to the
// active context when ownership matches:
//   * signed out (ownerId == null) → only guest projects (no ownerUserId)
//   * signed in  (ownerId set)     → only projects owned by that account
// Guest projects are NEVER auto-shown to a signed-in account; they must be
// explicitly imported. This is local isolation only — not a Supabase RLS rule.
export function isProjectVisible(p: Project, ownerId: string | null): boolean {
  const owner = p.ownerUserId ?? null;
  return ownerId == null ? owner == null : owner === ownerId;
}

function makeProject(partial: Partial<Project>, ownerUserId: string | null): Project {
  const now = Date.now();
  return {
    id: nanoid(),
    ownerUserId,
    localOrigin: ownerUserId ? "account" : "guest",
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
    canvasLinks: [],
    canvasNotes: [],
    canvasSections: [],
    createdAt: now,
    updatedAt: now,
  };
}

interface StoreState {
  projects: Project[];
  hydrated: boolean;
  canvasHistory: CanvasHistory;
  // The signed-in account id new projects are tagged with and the projects list
  // is filtered by. null = signed out / guest context. Session-only (not persisted).
  currentOwnerUserId: string | null;

  setCurrentOwnerUserId: (userId: string | null) => void;
  getVisibleProjects: (currentUserId?: string | null) => Project[];
  hasGuestProjects: () => boolean;
  importGuestProjectsToUser: (userId: string) => number;

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
  addCanvasScene: (projectId: string, x: number, y: number, atIndex?: number) => string | null;
  setSceneLayout: (projectId: string, sceneId: string, x: number, y: number) => void;
  arrangeScenes: (projectId: string, axis: "vertical" | "horizontal") => void;
  resetLayout: (projectId: string) => void;
  undoCanvas: (projectId: string) => void;
  redoCanvas: (projectId: string) => void;

  // Manual canvas connections (visual workflow links only).
  addLink: (projectId: string, fromSceneId: string, toSceneId: string) => void;
  updateLink: (projectId: string, linkId: string, patch: Partial<SceneLink>) => void;
  deleteLink: (projectId: string, linkId: string) => void;
  addCanvasLink: (
    projectId: string,
    fromNodeId: string,
    toNodeId: string,
    fromNodeType: CanvasNodeType,
    toNodeType: CanvasNodeType,
  ) => void;
  updateCanvasLink: (projectId: string, linkId: string, patch: Partial<CanvasLink>) => void;
  deleteCanvasLink: (projectId: string, linkId: string) => void;

  // Canvas production tools: notes and story sections are visual planning data.
  addCanvasNote: (projectId: string, x: number, y: number) => string | null;
  updateCanvasNote: (projectId: string, noteId: string, patch: Partial<CanvasNote>) => void;
  deleteCanvasNote: (projectId: string, noteId: string) => void;
  addCanvasSection: (projectId: string, x: number, y: number) => string | null;
  updateCanvasSection: (projectId: string, sectionId: string, patch: Partial<CanvasSection>) => void;
  deleteCanvasSection: (projectId: string, sectionId: string) => void;
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

type CanvasSnapshot = Pick<Project, "scenes" | "links" | "canvasLinks" | "canvasNotes" | "canvasSections">;

type CanvasHistoryEntry = {
  past: CanvasSnapshot[];
  future: CanvasSnapshot[];
};

type CanvasHistory = Record<string, CanvasHistoryEntry | undefined>;

const CANVAS_HISTORY_LIMIT = 40;

function cloneCanvasSnapshot(project: Project): CanvasSnapshot {
  return {
    scenes: structuredClone(project.scenes),
    links: structuredClone(project.links ?? []),
    canvasLinks: structuredClone(project.canvasLinks ?? []),
    canvasNotes: structuredClone(project.canvasNotes ?? []),
    canvasSections: structuredClone(project.canvasSections ?? []),
  };
}

function restoreCanvasSnapshot(project: Project, snapshot: CanvasSnapshot): Project {
  return touch({
    ...project,
    scenes: structuredClone(snapshot.scenes),
    links: structuredClone(snapshot.links ?? []),
    canvasLinks: structuredClone(snapshot.canvasLinks ?? []),
    canvasNotes: structuredClone(snapshot.canvasNotes ?? []),
    canvasSections: structuredClone(snapshot.canvasSections ?? []),
  });
}

function pushCanvasHistory(state: StoreState, projectId: string): CanvasHistory {
  const project = state.projects.find((p) => p.id === projectId);
  if (!project) return state.canvasHistory;
  const entry = state.canvasHistory[projectId] ?? { past: [], future: [] };
  return {
    ...state.canvasHistory,
    [projectId]: {
      past: [...entry.past.slice(-(CANVAS_HISTORY_LIMIT - 1)), cloneCanvasSnapshot(project)],
      future: [],
    },
  };
}

export const useStore = create<StoreState>()(
  persist(
    (set, getState) => ({
      projects: [],
      hydrated: false,
      canvasHistory: {},
      currentOwnerUserId: null,

      setCurrentOwnerUserId: (userId) => set({ currentOwnerUserId: userId }),

      getVisibleProjects: (currentUserId) => {
        const ownerId = currentUserId === undefined ? getState().currentOwnerUserId : currentUserId;
        return getState().projects.filter((p) => isProjectVisible(p, ownerId ?? null));
      },

      hasGuestProjects: () => getState().projects.some((p) => (p.ownerUserId ?? null) === null),

      // Claim every guest project for the given account. Preserves ids, scenes,
      // images (by reference), canvas data, and order — only ownership metadata
      // changes, so nothing is duplicated or lost.
      importGuestProjectsToUser: (userId) => {
        if (!userId) return 0;
        const now = Date.now();
        let imported = 0;
        set((s) => ({
          projects: s.projects.map((p) => {
            if ((p.ownerUserId ?? null) !== null) return p;
            imported += 1;
            return { ...p, ownerUserId: userId, localOrigin: "account", importedAt: now };
          }),
        }));
        return imported;
      },

      createProject: (partial) => {
        const project = makeProject(partial, getState().currentOwnerUserId);
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
        set((s) => {
          const { [id]: _deleted, ...canvasHistory } = s.canvasHistory;
          return { projects: s.projects.filter((p) => p.id !== id), canvasHistory };
        });
      },

      duplicateProject: (id) => {
        const original = getState().projects.find((p) => p.id === id);
        if (!original) return null;
        const now = Date.now();
        const sceneIdMap = new Map<string, string>();
        const scenes = original.scenes.map((sc) => {
          const newId = nanoid();
          sceneIdMap.set(sc.id, newId);
          return { ...sc, id: newId };
        });
        const noteIdMap = new Map<string, string>();
        const canvasNotes = (original.canvasNotes ?? []).map((note) => {
          const newId = nanoid();
          noteIdMap.set(note.id, newId);
          return { ...note, id: newId };
        });
        const sectionIdMap = new Map<string, string>();
        const canvasSections = (original.canvasSections ?? []).map((section) => {
          const newId = nanoid();
          sectionIdMap.set(section.id, newId);
          return { ...section, id: newId };
        });
        const mapCanvasNodeId = (type: CanvasNodeType, id: string) => {
          if (type === "scene") return sceneIdMap.get(id);
          if (type === "note") return noteIdMap.get(id);
          return sectionIdMap.get(id);
        };
        const links = (original.links ?? [])
          .map((link) => {
            const fromSceneId = sceneIdMap.get(link.fromSceneId);
            const toSceneId = sceneIdMap.get(link.toSceneId);
            return fromSceneId && toSceneId
              ? { ...link, id: nanoid(), fromSceneId, toSceneId }
              : null;
          })
          .filter((link): link is SceneLink => link !== null);
        const canvasLinks = (original.canvasLinks ?? [])
          .map((link) => {
            const fromNodeId = mapCanvasNodeId(link.fromNodeType, link.fromNodeId);
            const toNodeId = mapCanvasNodeId(link.toNodeType, link.toNodeId);
            return fromNodeId && toNodeId ? { ...link, id: nanoid(), fromNodeId, toNodeId } : null;
          })
          .filter((link): link is CanvasLink => link !== null);
        const copy: Project = {
          ...structuredClone(original),
          id: nanoid(),
          title: `${original.title} (Copy)`,
          createdAt: now,
          updatedAt: now,
          // New scene ids; images are shared by reference (blobs aren't copied).
          scenes,
          links,
          canvasLinks,
          canvasNotes,
          canvasSections,
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
              ? touch({
                  ...p,
                  scenes: p.scenes.filter((sc) => sc.id !== sceneId),
                  links: (p.links ?? []).filter((l) => l.fromSceneId !== sceneId && l.toSceneId !== sceneId),
                  canvasLinks: (p.canvasLinks ?? []).filter(
                    (l) =>
                      !(l.fromNodeType === "scene" && l.fromNodeId === sceneId) &&
                      !(l.toNodeType === "scene" && l.toNodeId === sceneId),
                  ),
                })
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
              layout: src.layout ? { x: src.layout.x + 40, y: src.layout.y + 40 } : undefined,
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

      addCanvasScene: (projectId, x, y, atIndex) => {
        const project = getState().projects.find((p) => p.id === projectId);
        if (!project) return null;
        const scene = makeScene(project.scenes.length);
        scene.collapsed = false;
        scene.layout = { x: Math.round(x), y: Math.round(y) };
        set((s) => ({
          canvasHistory: pushCanvasHistory(s, projectId),
          projects: s.projects.map((p) => {
            if (p.id !== projectId) return p;
            const scenes = [...p.scenes];
            scenes.splice(atIndex ?? scenes.length, 0, scene);
            return touch({ ...p, scenes });
          }),
        }));
        return scene.id;
      },

      // Persist a single card's canvas position. Video order is untouched.
      setSceneLayout: (projectId, sceneId, x, y) =>
        set((s) => ({
          canvasHistory: pushCanvasHistory(s, projectId),
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
          canvasHistory: pushCanvasHistory(s, projectId),
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
          canvasHistory: pushCanvasHistory(s, projectId),
          projects: s.projects.map((p) =>
            p.id === projectId
              ? touch({ ...p, scenes: p.scenes.map((sc) => ({ ...sc, layout: undefined })) })
              : p,
          ),
        })),

      undoCanvas: (projectId) =>
        set((s) => {
          const entry = s.canvasHistory[projectId];
          const previous = entry?.past[entry.past.length - 1];
          const project = s.projects.find((p) => p.id === projectId);
          if (!entry || !previous || !project) return s;
          return {
            projects: s.projects.map((p) => (p.id === projectId ? restoreCanvasSnapshot(p, previous) : p)),
            canvasHistory: {
              ...s.canvasHistory,
              [projectId]: {
                past: entry.past.slice(0, -1),
                future: [cloneCanvasSnapshot(project), ...entry.future].slice(0, CANVAS_HISTORY_LIMIT),
              },
            },
          };
        }),

      redoCanvas: (projectId) =>
        set((s) => {
          const entry = s.canvasHistory[projectId];
          const next = entry?.future[0];
          const project = s.projects.find((p) => p.id === projectId);
          if (!entry || !next || !project) return s;
          return {
            projects: s.projects.map((p) => (p.id === projectId ? restoreCanvasSnapshot(p, next) : p)),
            canvasHistory: {
              ...s.canvasHistory,
              [projectId]: {
                past: [...entry.past, cloneCanvasSnapshot(project)].slice(-CANVAS_HISTORY_LIMIT),
                future: entry.future.slice(1),
              },
            },
          };
        }),

      // Create a manual visual link. Skips self-links and exact duplicates so the
      // graph stays clean. Does NOT touch scene order or transitionToNext.
      addLink: (projectId, fromSceneId, toSceneId) =>
        set((s) => {
          // Bail out on no-ops (self-link or duplicate) BEFORE touching history,
          // so undo never replays an action that changed nothing.
          if (fromSceneId === toSceneId) return s;
          const p = s.projects.find((pr) => pr.id === projectId);
          if (!p) return s;
          const links = p.links ?? [];
          if (links.some((l) => l.fromSceneId === fromSceneId && l.toSceneId === toSceneId)) return s;
          const link: SceneLink = { id: nanoid(), fromSceneId, toSceneId };
          return {
            canvasHistory: pushCanvasHistory(s, projectId),
            projects: s.projects.map((pr) =>
              pr.id === projectId ? touch({ ...pr, links: [...links, link] }) : pr,
            ),
          };
        }),

      // Patch a manual link's label/type. Used by the canvas edge toolbar. Never
      // touches scene order — links are visual workflow annotations only.
      updateLink: (projectId, linkId, patch) =>
        set((s) => ({
          canvasHistory: pushCanvasHistory(s, projectId),
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
          canvasHistory: pushCanvasHistory(s, projectId),
          projects: s.projects.map((p) =>
            p.id === projectId ? touch({ ...p, links: (p.links ?? []).filter((l) => l.id !== linkId) }) : p,
          ),
        })),

      addCanvasLink: (projectId, fromNodeId, toNodeId, fromNodeType, toNodeType) =>
        set((s) => {
          // Bail out on no-ops (self-link or duplicate) BEFORE touching history.
          if (fromNodeId === toNodeId && fromNodeType === toNodeType) return s;
          const p = s.projects.find((pr) => pr.id === projectId);
          if (!p) return s;
          const canvasLinks = p.canvasLinks ?? [];
          const duplicate = canvasLinks.some(
            (l) =>
              l.fromNodeId === fromNodeId &&
              l.toNodeId === toNodeId &&
              l.fromNodeType === fromNodeType &&
              l.toNodeType === toNodeType,
          );
          if (duplicate) return s;
          const link: CanvasLink = {
            id: nanoid(),
            fromNodeId,
            toNodeId,
            fromNodeType,
            toNodeType,
            type: "note",
          };
          return {
            canvasHistory: pushCanvasHistory(s, projectId),
            projects: s.projects.map((pr) =>
              pr.id === projectId ? touch({ ...pr, canvasLinks: [...canvasLinks, link] }) : pr,
            ),
          };
        }),

      updateCanvasLink: (projectId, linkId, patch) =>
        set((s) => ({
          canvasHistory: pushCanvasHistory(s, projectId),
          projects: s.projects.map((p) =>
            p.id === projectId
              ? touch({
                  ...p,
                  canvasLinks: (p.canvasLinks ?? []).map((l) => (l.id === linkId ? { ...l, ...patch } : l)),
                })
              : p,
          ),
        })),

      deleteCanvasLink: (projectId, linkId) =>
        set((s) => ({
          canvasHistory: pushCanvasHistory(s, projectId),
          projects: s.projects.map((p) =>
            p.id === projectId
              ? touch({ ...p, canvasLinks: (p.canvasLinks ?? []).filter((l) => l.id !== linkId) })
              : p,
          ),
        })),

      addCanvasNote: (projectId, x, y) => {
        const id = nanoid();
        const now = Date.now();
        set((s) => ({
          canvasHistory: pushCanvasHistory(s, projectId),
          projects: s.projects.map((p) =>
            p.id === projectId
              ? touch({
                  ...p,
                  canvasNotes: [
                    ...(p.canvasNotes ?? []),
                    { id, x: Math.round(x), y: Math.round(y), text: "", kind: "idea", createdAt: now, updatedAt: now },
                  ],
                })
              : p,
          ),
        }));
        return id;
      },

      updateCanvasNote: (projectId, noteId, patch) =>
        set((s) => ({
          canvasHistory: pushCanvasHistory(s, projectId),
          projects: s.projects.map((p) =>
            p.id === projectId
              ? touch({
                  ...p,
                  canvasNotes: (p.canvasNotes ?? []).map((note) =>
                    note.id === noteId ? { ...note, ...patch, updatedAt: Date.now() } : note,
                  ),
                })
              : p,
          ),
        })),

      deleteCanvasNote: (projectId, noteId) =>
        set((s) => ({
          canvasHistory: pushCanvasHistory(s, projectId),
          projects: s.projects.map((p) =>
            p.id === projectId
              ? touch({
                  ...p,
                  canvasNotes: (p.canvasNotes ?? []).filter((note) => note.id !== noteId),
                  canvasLinks: (p.canvasLinks ?? []).filter(
                    (l) =>
                      !(l.fromNodeType === "note" && l.fromNodeId === noteId) &&
                      !(l.toNodeType === "note" && l.toNodeId === noteId),
                  ),
                })
              : p,
          ),
        })),

      addCanvasSection: (projectId, x, y) => {
        const id = nanoid();
        const now = Date.now();
        const existingCount = getState().projects.find((p) => p.id === projectId)?.canvasSections?.length ?? 0;
        const defaultTitles = ["Hook", "Setup", "Conflict", "Climax", "Outro"];
        set((s) => ({
          canvasHistory: pushCanvasHistory(s, projectId),
          projects: s.projects.map((p) =>
            p.id === projectId
              ? touch({
                  ...p,
                  canvasSections: [
                    ...(p.canvasSections ?? []),
                    {
                      id,
                      title: defaultTitles[existingCount % defaultTitles.length],
                      x: Math.round(x),
                      y: Math.round(y),
                      width: 420,
                      height: 260,
                      type: "custom",
                      createdAt: now,
                      updatedAt: now,
                    },
                  ],
                })
              : p,
          ),
        }));
        return id;
      },

      updateCanvasSection: (projectId, sectionId, patch) =>
        set((s) => ({
          canvasHistory: pushCanvasHistory(s, projectId),
          projects: s.projects.map((p) =>
            p.id === projectId
              ? touch({
                  ...p,
                  canvasSections: (p.canvasSections ?? []).map((section) =>
                    section.id === sectionId ? { ...section, ...patch, updatedAt: Date.now() } : section,
                  ),
                })
              : p,
          ),
        })),

      deleteCanvasSection: (projectId, sectionId) =>
        set((s) => ({
          canvasHistory: pushCanvasHistory(s, projectId),
          projects: s.projects.map((p) =>
            p.id === projectId
              ? touch({
                  ...p,
                  canvasSections: (p.canvasSections ?? []).filter((section) => section.id !== sectionId),
                  canvasLinks: (p.canvasLinks ?? []).filter(
                    (l) =>
                      !(l.fromNodeType === "section" && l.fromNodeId === sectionId) &&
                      !(l.toNodeType === "section" && l.toNodeId === sectionId),
                  ),
                })
              : p,
          ),
        })),
    }),
    {
      name: "framefore-state",
      version: 9,
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
            // v9: account-scoped local ownership. Pre-auth projects have no owner
            // — keep them as GUEST projects. Never auto-assign them to the first
            // user who happens to sign in; they stay guest until explicitly imported.
            ownerUserId: p.ownerUserId ?? null,
            localOrigin: p.localOrigin ?? "guest",
            // v5: project-level default models (scenes inherit when empty).
            defaultImageModel: p.defaultImageModel ?? "",
            defaultVideoModel: p.defaultVideoModel ?? "",
            // v6: manual canvas links (visual only).
            links: p.links ?? [],
            // v7: canvas production tools (visual only).
            canvasNotes: (p.canvasNotes ?? []).map((note) => ({ ...note, kind: note.kind ?? "idea" })),
            canvasSections: p.canvasSections ?? [],
            // v8: flexible canvas relationships across scenes and notes.
            canvasLinks: p.canvasLinks ?? [],
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
