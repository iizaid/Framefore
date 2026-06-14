import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Panel,
  MarkerType,
  ConnectionLineType,
  useReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type NodeMouseHandler,
} from "@xyflow/react";
import type { Project } from "@/types";
import {
  CANVAS_CARD_W,
  CANVAS_CARD_H,
  defaultSceneLayout,
  useStore,
} from "@/store/useStore";
import { SceneFlowNode } from "./SceneFlowNode";
import { OrderEdge } from "./OrderEdge";
import { SceneLinkEdge } from "./SceneLinkEdge";
import { FlowToolbar } from "./FlowToolbar";
import { FlowCallbacksContext, type FlowCallbacks } from "./flowContext";

// Module-level so identities never change between renders — React Flow strongly
// recommends this to avoid re-instantiating custom node/edge components.
const nodeTypes = { scene: SceneFlowNode };
const edgeTypes = { order: OrderEdge, sceneLink: SceneLinkEdge };

const ORDER_MARKER = { type: MarkerType.ArrowClosed, color: "rgba(18,18,18,0.28)", width: 16, height: 16 };
const LINK_MARKER = { type: MarkerType.ArrowClosed, color: "rgba(18,18,18,0.6)", width: 18, height: 18 };

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2;

type Props = {
  project: Project;
  activeId: string | null;
  onSelect: (id: string | null) => void;
  onEdit: (id: string) => void;
};

function FlowCanvasInner({ project, activeId, onSelect, onEdit }: Props) {
  const setSceneLayout = useStore((s) => s.setSceneLayout);
  const addLink = useStore((s) => s.addLink);
  const deleteLink = useStore((s) => s.deleteLink);
  const rf = useReactFlow();

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  const scenes = project.scenes;
  const links = project.links;

  // ── Reconcile nodes from the store (source of truth for which scenes exist
  // and where they sit). Reuse the previous node object when its position is
  // unchanged so untouched nodes don't re-render. Never fires mid-drag because
  // project.scenes only changes on drop / add / delete / reorder / arrange.
  useEffect(() => {
    setNodes((prev) => {
      const prevById = new Map(prev.map((n) => [n.id, n]));
      return scenes.map((s, i) => {
        const pos = s.layout ?? defaultSceneLayout(i, "vertical");
        const ex = prevById.get(s.id);
        if (ex) {
          return ex.position.x === pos.x && ex.position.y === pos.y ? ex : { ...ex, position: pos };
        }
        return {
          id: s.id,
          type: "scene",
          position: pos,
          data: { sceneId: s.id },
          deletable: false, // Delete key must never remove a scene from the canvas
        } satisfies Node;
      });
    });
  }, [scenes]);

  // ── Reconcile edges: subtle locked order spine + editable manual links.
  // Carry over `selected` so an unrelated store change doesn't drop the user's
  // current edge selection.
  useEffect(() => {
    const orderEdges: Edge[] = scenes.slice(0, -1).map((s, i) => ({
      id: `order-${s.id}`,
      source: s.id,
      target: scenes[i + 1].id,
      sourceHandle: "out",
      targetHandle: "in",
      type: "order",
      data: { fromIndex: i, label: s.transitionToNext.trim() || undefined },
      deletable: false,
      selectable: false,
      markerEnd: ORDER_MARKER,
    }));

    const sceneIds = new Set(scenes.map((s) => s.id));
    const manualEdges: Edge[] = (links ?? [])
      .filter((l) => sceneIds.has(l.fromSceneId) && sceneIds.has(l.toSceneId))
      .map((l) => ({
        id: l.id,
        source: l.fromSceneId,
        target: l.toSceneId,
        sourceHandle: "out",
        targetHandle: "in",
        type: "sceneLink",
        data: { linkId: l.id, label: l.label },
        markerEnd: LINK_MARKER,
      }));

    setEdges((prev) => {
      const selectedIds = new Set(prev.filter((e) => e.selected).map((e) => e.id));
      return [...orderEdges, ...manualEdges].map((e) =>
        selectedIds.has(e.id) ? { ...e, selected: true } : e,
      );
    });
  }, [scenes, links]);

  // ── Drag → persist position to the store on drop only (mirrors the old canvas).
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      for (const c of changes) {
        if (c.type === "position" && c.dragging === false && c.position) {
          setSceneLayout(project.id, c.id, Math.round(c.position.x), Math.round(c.position.y));
        }
      }
    },
    [project.id, setSceneLayout],
  );

  // ── Edge changes. Only manual links are deletable; sync removals to the store.
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
      for (const c of changes) {
        if (c.type === "remove") deleteLink(project.id, c.id);
      }
    },
    [project.id, deleteLink],
  );

  // ── New manual link from dragging a handle. addLink dedupes + blocks self-links.
  const onConnect = useCallback(
    (c: Connection) => {
      if (c.source && c.target && c.source !== c.target) addLink(project.id, c.source, c.target);
    },
    [project.id, addLink],
  );

  const isValidConnection = useCallback(
    (c: Connection | Edge) => !!c.source && !!c.target && c.source !== c.target,
    [],
  );

  // ── Selection ↔ inspector. Track whether a selection came from a canvas click
  // so we only auto-center when selection arrives from elsewhere (the timeline).
  const internalSelect = useRef(false);
  const onNodeClick = useCallback<NodeMouseHandler>(
    (_, node) => {
      internalSelect.current = true;
      onSelect(node.id);
    },
    [onSelect],
  );
  const onPaneClick = useCallback(() => onSelect(null), [onSelect]);

  const prevActive = useRef<string | null>(null);
  useEffect(() => {
    if (activeId && activeId !== prevActive.current && !internalSelect.current) {
      const node = rf.getNode(activeId);
      if (node) {
        const w = node.measured?.width ?? CANVAS_CARD_W;
        const h = node.measured?.height ?? CANVAS_CARD_H;
        rf.setCenter(node.position.x + w / 2, node.position.y + h / 2, {
          zoom: rf.getZoom(),
          duration: 400,
        });
      }
    }
    internalSelect.current = false;
    prevActive.current = activeId;
  }, [activeId, rf]);

  const callbacks = useMemo<FlowCallbacks>(
    () => ({ projectId: project.id, activeId, onSelect, onEdit }),
    [project.id, activeId, onSelect, onEdit],
  );

  return (
    <FlowCallbacksContext.Provider value={callbacks}>
      <div className="relative min-h-0 min-w-0 flex-1 bg-[var(--color-surface-2)]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          isValidConnection={isValidConnection}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          connectionLineType={ConnectionLineType.Bezier}
          defaultEdgeOptions={{ type: "sceneLink" }}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          fitView
          fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
          proOptions={{ hideAttribution: true }}
          deleteKeyCode={["Backspace", "Delete"]}
          multiSelectionKeyCode={["Meta", "Shift"]}
          panOnScroll
          selectionOnDrag={false}
        >
          <Background variant={BackgroundVariant.Dots} gap={18} size={1.3} color="rgba(18,18,18,0.16)" />
          <Panel position="top-right">
            <FlowToolbar projectId={project.id} />
          </Panel>
        </ReactFlow>

        {scenes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <p className="text-sm text-[var(--color-ink-faint)]">
              No scenes yet — add one to start arranging your board.
            </p>
          </div>
        )}
      </div>
    </FlowCallbacksContext.Provider>
  );
}

// React Flow needs a Provider above any component that calls useReactFlow
// (our toolbar + the focus-on-select effect), so wrap the inner canvas here.
export function FlowCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
