import { createContext, useContext } from "react";

export type CanvasToolMode = "select" | "connect" | "pan";

// Stable, app-level handles shared with every custom node / edge. Kept out of
// React Flow `data` on purpose: node data is compared by identity for memoized
// re-renders, so passing fresh callbacks per render would thrash. Identifiers
// (projectId / activeId) live here; each node derives its own fresh scene data
// from the Zustand store using just its sceneId.
export interface FlowCallbacks {
  projectId: string;
  activeId: string | null;
  toolMode: CanvasToolMode;
  onSelect: (id: string | null) => void;
  onEdit: (id: string) => void;
}

export const FlowCallbacksContext = createContext<FlowCallbacks | null>(null);

export function useFlowCallbacks(): FlowCallbacks {
  const ctx = useContext(FlowCallbacksContext);
  if (!ctx) throw new Error("useFlowCallbacks must be used within a FlowCallbacksContext provider");
  return ctx;
}

// Node data is deliberately minimal — just enough to look the scene up. See the
// note above on why we don't embed the full scene object or callbacks here.
export interface SceneNodeData {
  sceneId: string;
  [key: string]: unknown;
}

// Order connectors carry the source scene's index so the "+ add scene between"
// affordance knows where to splice, plus an optional transition label.
export interface OrderEdgeData {
  fromIndex: number;
  label?: string;
  [key: string]: unknown;
}

export interface SceneLinkEdgeData {
  linkId: string;
  label?: string;
  [key: string]: unknown;
}
