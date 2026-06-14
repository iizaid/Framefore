import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Maximize2,
  Rows3,
  Columns3,
  RotateCcw,
  Plus,
  Minus,
  CornerDownRight,
} from "lucide-react";
import type { Project } from "@/types";
import { cn } from "@/lib/utils";
import {
  CANVAS_CARD_W,
  CANVAS_CARD_H,
  defaultSceneLayout,
  useStore,
} from "@/store/useStore";
import { CanvasCard } from "./CanvasCard";

type Pos = { x: number; y: number };
type Viewport = { x: number; y: number; scale: number };

const MIN_SCALE = 0.3;
const MAX_SCALE = 2;
const DRAG_THRESHOLD = 4; // px before a press becomes a drag (vs. a click-select)

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

export function CanvasBoard({
  project,
  activeId,
  onSelect,
  onEdit,
}: {
  project: Project;
  activeId: string | null;
  onSelect: (id: string | null) => void;
  onEdit: (id: string) => void;
}) {
  const setSceneLayout = useStore((s) => s.setSceneLayout);
  const arrangeScenes = useStore((s) => s.arrangeScenes);
  const resetLayout = useStore((s) => s.resetLayout);

  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 });

  // Live card positions. Seeded from each scene's saved layout (or an auto-placed
  // fallback). Updated locally while dragging and committed to the store on drop,
  // so we don't thrash IndexedDB on every pointer move.
  const [positions, setPositions] = useState<Record<string, Pos>>({});
  const positionsRef = useRef(positions);
  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Re-seed positions whenever scenes change (add/delete/reorder/layout edits).
  useEffect(() => {
    setPositions(() => {
      const next: Record<string, Pos> = {};
      project.scenes.forEach((s, i) => {
        next[s.id] = s.layout ?? defaultSceneLayout(i, "vertical");
      });
      return next;
    });
  }, [project.scenes]);

  const fitView = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const scenes = project.scenes;
    if (scenes.length === 0) {
      setViewport({ x: 0, y: 0, scale: 1 });
      return;
    }
    const pos = positionsRef.current;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    scenes.forEach((s, i) => {
      const p = pos[s.id] ?? defaultSceneLayout(i, "vertical");
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + CANVAS_CARD_W);
      maxY = Math.max(maxY, p.y + CANVAS_CARD_H);
    });
    const pad = 64;
    const bw = Math.max(maxX - minX, 1);
    const bh = Math.max(maxY - minY, 1);
    const scale = clamp(Math.min((rect.width - pad * 2) / bw, (rect.height - pad * 2) / bh), MIN_SCALE, 1.4);
    setViewport({
      x: (rect.width - bw * scale) / 2 - minX * scale,
      y: (rect.height - bh * scale) / 2 - minY * scale,
      scale,
    });
  }, [project.scenes]);

  // Fit once on first paint so the board opens framed, not in a void.
  const didFit = useRef(false);
  useLayoutEffect(() => {
    if (didFit.current || project.scenes.length === 0) return;
    if (Object.keys(positionsRef.current).length === 0) return;
    didFit.current = true;
    fitView();
  }, [positions, fitView, project.scenes.length]);

  // ── Wheel zoom (native non-passive so we can preventDefault) ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      setViewport((v) => {
        const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
        const scale = clamp(v.scale * factor, MIN_SCALE, MAX_SCALE);
        const wx = (cx - v.x) / v.scale;
        const wy = (cy - v.y) / v.scale;
        return { x: cx - wx * scale, y: cy - wy * scale, scale };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const zoomBy = (factor: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    setViewport((v) => {
      const scale = clamp(v.scale * factor, MIN_SCALE, MAX_SCALE);
      const wx = (cx - v.x) / v.scale;
      const wy = (cy - v.y) / v.scale;
      return { x: cx - wx * scale, y: cy - wy * scale, scale };
    });
  };

  // ── Card dragging ──
  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null);

  const onCardDown = (e: React.PointerEvent, id: string, index: number) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const origin = positionsRef.current[id] ?? defaultSceneLayout(index, "vertical");
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, origX: origin.x, origY: origin.y, moved: false };
  };

  const onCardMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / viewport.scale;
    const dy = (e.clientY - d.startY) / viewport.scale;
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > DRAG_THRESHOLD) {
      d.moved = true;
      setDraggingId(d.id);
    }
    if (d.moved) {
      setPositions((p) => ({ ...p, [d.id]: { x: d.origX + dx, y: d.origY + dy } }));
    }
  };

  const onCardUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    if (d.moved) {
      const final = positionsRef.current[d.id];
      if (final) setSceneLayout(project.id, d.id, Math.round(final.x), Math.round(final.y));
    } else {
      onSelect(d.id); // a press without movement = select
    }
    dragRef.current = null;
    setDraggingId(null);
  };

  // ── Background pan (and click-to-deselect) ──
  const panRef = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);
  const [panning, setPanning] = useState(false);

  const onBgDown = (e: React.PointerEvent) => {
    panRef.current = { x: e.clientX, y: e.clientY, vx: viewport.x, vy: viewport.y, moved: false };
    containerRef.current?.setPointerCapture(e.pointerId);
  };
  const onBgMove = (e: React.PointerEvent) => {
    const p = panRef.current;
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (!p.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      p.moved = true;
      setPanning(true);
    }
    if (p.moved) setViewport((v) => ({ ...v, x: p.vx + dx, y: p.vy + dy }));
  };
  const onBgUp = (e: React.PointerEvent) => {
    const p = panRef.current;
    if (!p) return;
    containerRef.current?.releasePointerCapture?.(e.pointerId);
    if (!p.moved) onSelect(null); // clicked empty canvas → deselect
    panRef.current = null;
    setPanning(false);
  };

  const arrangeAndFit = (axis: "vertical" | "horizontal") => {
    arrangeScenes(project.id, axis);
    requestAnimationFrame(() => requestAnimationFrame(fitView));
  };
  const resetAndFit = () => {
    resetLayout(project.id);
    requestAnimationFrame(() => requestAnimationFrame(fitView));
  };

  // Connector geometry: center-to-center, following the *video order*. Drawn
  // beneath the cards so the opaque cards mask the inner span — the line reads as
  // edge-to-edge and re-routes the instant order or position changes.
  const centerOf = (id: string, i: number): Pos => {
    const p = positions[id] ?? defaultSceneLayout(i, "vertical");
    return { x: p.x + CANVAS_CARD_W / 2, y: p.y + CANVAS_CARD_H / 2 };
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={onBgDown}
      onPointerMove={onBgMove}
      onPointerUp={onBgUp}
      className={cn(
        "relative min-h-0 min-w-0 flex-1 touch-none overflow-hidden bg-[var(--color-surface-2)]",
        panning ? "cursor-grabbing" : "cursor-grab",
      )}
    >
      {/* World layer (panned + zoomed) */}
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})` }}
      >
        {/* Dotted backdrop that moves with the canvas */}
        <div className="dot-canvas pointer-events-none absolute" style={{ left: -4000, top: -4000, width: 8000, height: 8000 }} />

        {/* Connectors (order-based) */}
        <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width={1} height={1}>
          {project.scenes.slice(0, -1).map((s, i) => {
            const a = centerOf(s.id, i);
            const next = project.scenes[i + 1];
            const b = centerOf(next.id, i + 1);
            return (
              <line
                key={`${s.id}-${next.id}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="rgba(18,18,18,0.22)"
                strokeWidth={2}
              />
            );
          })}
        </svg>

        {/* Transition labels at connector midpoints */}
        {project.scenes.slice(0, -1).map((s, i) => {
          const label = s.transitionToNext.trim();
          if (!label) return null;
          const a = centerOf(s.id, i);
          const b = centerOf(project.scenes[i + 1].id, i + 1);
          return (
            <div
              key={`lbl-${s.id}`}
              className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
              style={{ left: (a.x + b.x) / 2, top: (a.y + b.y) / 2 }}
            >
              <span className="inline-flex max-w-[180px] items-center gap-1 rounded-full border border-[var(--color-border-strong)] bg-white px-2 py-0.5 text-[10px] font-medium text-[var(--color-ink-faint)] shadow-sm">
                <CornerDownRight size={10} className="shrink-0" />
                <span className="truncate">{label}</span>
              </span>
            </div>
          );
        })}

        {/* Cards */}
        {project.scenes.map((scene, i) => {
          const pos = positions[scene.id] ?? defaultSceneLayout(i, "vertical");
          const isDragging = draggingId === scene.id;
          return (
            <div
              key={scene.id}
              className="absolute"
              style={{
                left: pos.x,
                top: pos.y,
                zIndex: isDragging ? 40 : activeId === scene.id ? 30 : 10,
                cursor: isDragging ? "grabbing" : "grab",
              }}
              onPointerDown={(e) => onCardDown(e, scene.id, i)}
              onPointerMove={onCardMove}
              onPointerUp={onCardUp}
            >
              <CanvasCard
                scene={scene}
                index={i}
                project={project}
                isActive={activeId === scene.id}
                isDragging={isDragging}
                onEdit={() => onEdit(scene.id)}
              />
            </div>
          );
        })}
      </div>

      {/* Floating toolbar (fixed in viewport) */}
      <div className="absolute right-4 top-4 z-30 flex items-center gap-1 rounded-full border border-[var(--color-border-strong)] bg-white/90 p-1 shadow-sm backdrop-blur">
        <ToolBtn label="Zoom out" onClick={() => zoomBy(1 / 1.2)}><Minus size={15} /></ToolBtn>
        <span className="w-10 text-center text-[11px] font-medium tabular-nums text-[var(--color-ink-soft)]">
          {Math.round(viewport.scale * 100)}%
        </span>
        <ToolBtn label="Zoom in" onClick={() => zoomBy(1.2)}><Plus size={15} /></ToolBtn>
        <div className="mx-0.5 h-5 w-px bg-[var(--color-border-strong)]" />
        <ToolBtn label="Fit view" onClick={fitView}><Maximize2 size={15} /></ToolBtn>
        <ToolBtn label="Arrange vertical" onClick={() => arrangeAndFit("vertical")}><Rows3 size={15} /></ToolBtn>
        <ToolBtn label="Arrange horizontal" onClick={() => arrangeAndFit("horizontal")}><Columns3 size={15} /></ToolBtn>
        <ToolBtn label="Reset layout" onClick={resetAndFit}><RotateCcw size={15} /></ToolBtn>
      </div>

      {project.scenes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <p className="text-sm text-[var(--color-ink-faint)]">No scenes yet — add one to start arranging your board.</p>
        </div>
      )}
    </div>
  );
}

function ToolBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      title={label}
      aria-label={label}
      className="grid h-7 w-7 place-items-center rounded-full text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-stone-surface)] hover:text-[var(--color-ink)]"
    >
      {children}
    </button>
  );
}
