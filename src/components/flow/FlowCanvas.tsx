import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
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
  getBezierPath,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type ConnectionLineComponentProps,
  type NodeMouseHandler,
} from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { Project } from "@/types";
import {
  CANVAS_CARD_W,
  CANVAS_CARD_H,
  defaultSceneLayout,
  useStore,
} from "@/store/useStore";
import { SceneFlowNode } from "./SceneFlowNode";
import { CanvasNoteNode } from "./CanvasNoteNode";
import { CanvasSectionNode } from "./CanvasSectionNode";
import { OrderEdge } from "./OrderEdge";
import { SceneLinkEdge } from "./SceneLinkEdge";
import { FlowToolbar } from "./FlowToolbar";
import { FlowCallbacksContext, type CanvasToolMode, type FlowCallbacks } from "./flowContext";

// Module-level so identities never change between renders — React Flow strongly
// recommends this to avoid re-instantiating custom node/edge components.
// Future canvas entities (notes, section frames, branch nodes) can be added here
// without changing the core rule that timeline order drives exported video order.
const nodeTypes = { scene: SceneFlowNode, note: CanvasNoteNode, section: CanvasSectionNode };
const edgeTypes = { order: OrderEdge, sceneLink: SceneLinkEdge };

const ORDER_MARKER = { type: MarkerType.ArrowClosed, color: "rgba(18,18,18,0.38)", width: 16, height: 16 };
const LINK_MARKER = { type: MarkerType.ArrowClosed, color: "rgba(18,18,18,0.78)", width: 18, height: 18 };

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2;

type Props = {
  project: Project;
  activeId: string | null;
  onSelect: (id: string | null) => void;
  onEdit: (id: string) => void;
};

function WorkflowConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
  fromPosition,
  toPosition,
  connectionStatus,
}: ConnectionLineComponentProps) {
  const [path] = getBezierPath({
    sourceX: fromX,
    sourceY: fromY,
    sourcePosition: fromPosition,
    targetX: toX,
    targetY: toY,
    targetPosition: toPosition,
    curvature: 0.32,
  });
  const isValid = connectionStatus === "valid";

  return (
    <g className="workflow-connection-line">
      <path
        d={path}
        fill="none"
        stroke={isValid ? "rgba(18,18,18,0.88)" : "rgba(18,18,18,0.38)"}
        strokeWidth={isValid ? 2.4 : 1.8}
        strokeLinecap="round"
        strokeDasharray={isValid ? undefined : "6 5"}
      />
      <circle
        cx={toX}
        cy={toY}
        r={isValid ? 4.5 : 3.5}
        fill={isValid ? "#121212" : "#ffffff"}
        stroke={isValid ? "#121212" : "rgba(18,18,18,0.38)"}
        strokeWidth={1.8}
      />
    </g>
  );
}

function FlowCanvasInner({ project, activeId, onSelect, onEdit }: Props) {
  const setSceneLayout = useStore((s) => s.setSceneLayout);
  const addLink = useStore((s) => s.addLink);
  const deleteLink = useStore((s) => s.deleteLink);
  const addScene = useStore((s) => s.addScene);
  const addCanvasNote = useStore((s) => s.addCanvasNote);
  const updateCanvasNote = useStore((s) => s.updateCanvasNote);
  const deleteCanvasNote = useStore((s) => s.deleteCanvasNote);
  const addCanvasSection = useStore((s) => s.addCanvasSection);
  const updateCanvasSection = useStore((s) => s.updateCanvasSection);
  const deleteCanvasSection = useStore((s) => s.deleteCanvasSection);
  const rf = useReactFlow();

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [toolMode, setToolMode] = useState<CanvasToolMode>("select");

  const scenes = project.scenes;
  const links = project.links;
  const notes = project.canvasNotes ?? [];
  const sections = project.canvasSections ?? [];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      if (
        target?.isContentEditable ||
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT" ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "v") setToolMode("select");
      else if (key === "c") setToolMode("connect");
      else if (key === "s") setToolMode("scene");
      else if (key === "n") setToolMode("note");
      else if (key === "g") setToolMode("section");
      else if (key === "h" || event.key === " ") {
        event.preventDefault();
        setToolMode("pan");
      } else if (key === "f") {
        event.preventDefault();
        void rf.fitView({ duration: 300, padding: 0.2, maxZoom: 1 });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [rf]);

  // ── Reconcile nodes from the store (source of truth for which scenes exist
  // and where they sit). Reuse the previous node object when its position is
  // unchanged so untouched nodes don't re-render. Never fires mid-drag because
  // project.scenes only changes on drop / add / delete / reorder / arrange.
  useEffect(() => {
    setNodes((prev) => {
      const prevById = new Map(prev.map((n) => [n.id, n]));
      const makeNode = (node: Node): Node => {
        const ex = prevById.get(node.id);
        if (!ex) return node;
        const samePosition = ex.position.x === node.position.x && ex.position.y === node.position.y;
        return samePosition ? { ...ex, ...node, selected: ex.selected } : { ...ex, ...node };
      };

      const sectionNodes = sections.map((section) =>
        makeNode({
          id: section.id,
          type: "section",
          position: { x: section.x, y: section.y },
          data: { sectionId: section.id },
          style: { width: section.width, height: section.height },
          zIndex: 0,
        } satisfies Node),
      );
      const noteNodes = notes.map((note) =>
        makeNode({
          id: note.id,
          type: "note",
          position: { x: note.x, y: note.y },
          data: { noteId: note.id },
          zIndex: 5,
        } satisfies Node),
      );
      const sceneNodes = scenes.map((s, i) =>
        makeNode({
          id: s.id,
          type: "scene",
          position: s.layout ?? defaultSceneLayout(i, "vertical"),
          data: { sceneId: s.id },
          deletable: false, // Delete key must never remove a scene from the canvas
          zIndex: 10,
        } satisfies Node),
      );

      return [...sectionNodes, ...noteNodes, ...sceneNodes];
    });
  }, [scenes, notes, sections]);

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
        data: { linkId: l.id, label: l.label, type: l.type },
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
      const sceneIds = new Set(scenes.map((s) => s.id));
      const noteIds = new Set(notes.map((n) => n.id));
      const sectionIds = new Set(sections.map((s) => s.id));
      for (const c of changes) {
        if (c.type === "position" && c.dragging === false && c.position) {
          const x = Math.round(c.position.x);
          const y = Math.round(c.position.y);
          if (sceneIds.has(c.id)) setSceneLayout(project.id, c.id, x, y);
          else if (noteIds.has(c.id)) updateCanvasNote(project.id, c.id, { x, y });
          else if (sectionIds.has(c.id)) updateCanvasSection(project.id, c.id, { x, y });
        } else if (c.type === "remove") {
          if (noteIds.has(c.id)) deleteCanvasNote(project.id, c.id);
          else if (sectionIds.has(c.id)) deleteCanvasSection(project.id, c.id);
        }
      }
    },
    [
      project.id,
      scenes,
      notes,
      sections,
      setSceneLayout,
      updateCanvasNote,
      deleteCanvasNote,
      updateCanvasSection,
      deleteCanvasSection,
    ],
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
    (c: Connection | Edge) => {
      if (!c.source || !c.target || c.source === c.target) return false;
      if ("sourceHandle" in c && c.sourceHandle && c.sourceHandle !== "out") return false;
      if ("targetHandle" in c && c.targetHandle && c.targetHandle !== "in") return false;
      return !(links ?? []).some((l) => l.fromSceneId === c.source && l.toSceneId === c.target);
    },
    [links],
  );

  // ── Selection ↔ inspector. Track whether a selection came from a canvas click
  // so we only auto-center when selection arrives from elsewhere (the timeline).
  const internalSelect = useRef(false);
  const onNodeClick = useCallback<NodeMouseHandler>(
    (_, node) => {
      if (toolMode !== "select" && toolMode !== "connect") return;
      internalSelect.current = true;
      if (node.type === "scene") onSelect(node.id);
    },
    [onSelect, toolMode],
  );
  const onPaneClick = useCallback(
    (event: ReactMouseEvent) => {
      if (toolMode === "pan") return;

      const position = rf.screenToFlowPosition({ x: event.clientX, y: event.clientY });

      if (toolMode === "scene") {
        const before = new Set(useStore.getState().projects.find((p) => p.id === project.id)?.scenes.map((s) => s.id));
        addScene(project.id);
        const created = useStore
          .getState()
          .projects.find((p) => p.id === project.id)
          ?.scenes.find((s) => !before.has(s.id));
        if (created) {
          setSceneLayout(project.id, created.id, Math.round(position.x), Math.round(position.y));
          internalSelect.current = true;
          onSelect(created.id);
        }
        setToolMode("select");
        return;
      }

      if (toolMode === "note") {
        addCanvasNote(project.id, position.x, position.y);
        setToolMode("select");
        return;
      }

      if (toolMode === "section") {
        addCanvasSection(project.id, position.x, position.y);
        setToolMode("select");
        return;
      }

      onSelect(null);
    },
    [addCanvasNote, addCanvasSection, addScene, onSelect, project.id, rf, setSceneLayout, toolMode],
  );

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
    () => ({ projectId: project.id, activeId, toolMode, onSelect, onEdit }),
    [project.id, activeId, toolMode, onSelect, onEdit],
  );

  return (
    <FlowCallbacksContext.Provider value={callbacks}>
      <div className="relative min-h-0 min-w-0 flex-1 bg-[var(--color-surface-2)]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          className={cn("flow-canvas", `flow-canvas--${toolMode}`)}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          isValidConnection={isValidConnection}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          connectionLineType={ConnectionLineType.Bezier}
          connectionLineComponent={WorkflowConnectionLine}
          connectionLineStyle={{
            stroke: "rgba(18,18,18,0.45)",
            strokeWidth: 2,
          }}
          defaultEdgeOptions={{ type: "sceneLink" }}
          nodesDraggable={toolMode === "select"}
          nodesConnectable={toolMode === "connect"}
          elementsSelectable={toolMode === "select" || toolMode === "connect"}
          selectNodesOnDrag={toolMode === "select"}
          connectOnClick={false}
          autoPanOnConnect
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          fitView
          fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
          proOptions={{ hideAttribution: true }}
          deleteKeyCode={["Backspace", "Delete"]}
          multiSelectionKeyCode={["Meta", "Shift"]}
          panOnScroll
          panOnDrag={toolMode === "pan"}
          selectionOnDrag={toolMode === "select"}
        >
          <Background variant={BackgroundVariant.Dots} gap={18} size={1.3} color="rgba(18,18,18,0.16)" />
          {toolMode !== "select" && (
            <Panel position="top-center">
              <div className="pointer-events-none rounded-full border border-[var(--color-border-strong)] bg-white/90 px-3 py-1.5 text-[11px] font-medium text-[var(--color-ink-soft)] shadow-sm backdrop-blur">
                {toolMode === "connect" && "Connect: drag from a right port to a left port."}
                {toolMode === "pan" && "Pan: drag the canvas to move around."}
                {toolMode === "scene" && "Scene tool: click empty canvas to add a scene."}
                {toolMode === "note" && "Note tool: click empty canvas to add a note."}
                {toolMode === "section" && "Section tool: click empty canvas to add a section."}
              </div>
            </Panel>
          )}
          <Panel position="bottom-center">
            <FlowToolbar projectId={project.id} toolMode={toolMode} onToolModeChange={setToolMode} />
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
