import { memo, useEffect, useRef, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Clock, Clapperboard, ImageIcon, AlertTriangle, Pencil } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { essentialGaps } from "@/lib/colors";
import { STATUS_STYLE } from "@/lib/constants";
import { CANVAS_CARD_W, useStore } from "@/store/useStore";
import { ImageThumb } from "../ui/widgets";
import { useFlowCallbacks } from "./flowContext";

// Custom React Flow node for a scene. Reads its own scene fresh from the store by
// id, so inline edits / model changes / image uploads reflect immediately and a
// node only re-renders when ITS scene changes. Selection + dragging are handled
// by React Flow; this node only renders + does inline rename + opens the editor.
function SceneFlowNodeImpl({ id }: NodeProps) {
  const { projectId, activeId, toolMode, onEdit } = useFlowCallbacks();

  // Fine-grained selectors: each returns a stable value so this node re-renders
  // only when its own scene (or its position in the order) actually changes.
  const scene = useStore((s) =>
    s.projects.find((p) => p.id === projectId)?.scenes.find((sc) => sc.id === id),
  );
  const index = useStore((s) => {
    const p = s.projects.find((pr) => pr.id === projectId);
    return p ? p.scenes.findIndex((sc) => sc.id === id) : -1;
  });
  const defaultVideoModel = useStore(
    (s) => s.projects.find((p) => p.id === projectId)?.defaultVideoModel ?? "",
  );
  const updateScene = useStore((s) => s.updateScene);

  const [editing, setEditing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && scene) {
      setDraft(scene.title);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  if (!scene) return null; // scene deleted out from under us — node is being removed

  const startEditing = () => setEditing(true);
  const commit = () => {
    updateScene(projectId, scene.id, { title: draft.trim() });
    setEditing(false);
  };
  const cancel = () => setEditing(false);

  const isActive = activeId === scene.id;
  const cover = scene.images[0];
  const gaps = essentialGaps(scene);
  const status = STATUS_STYLE[scene.status];
  const videoModel = scene.videoModel.trim() || defaultVideoModel.trim();
  const promptPreview = scene.visualPrompt.trim() || scene.summary.trim();
  const narrationPreview = scene.narrationPart.trim();
  const showHandles = hovered || isActive || toolMode === "connect";
  const isConnectMode = toolMode === "connect";

  return (
    <div
      style={{ width: CANVAS_CARD_W }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "group/node relative flex select-none flex-col overflow-visible rounded-[var(--radius-card)] border bg-white transition-shadow duration-150",
        isActive
          ? "border-neutral-400 shadow-[0_8px_24px_-10px_rgba(0,0,0,0.22)] ring-2 ring-neutral-900/15"
          : "border-[var(--color-border-strong)] shadow-[0_4px_14px_-8px_rgba(0,0,0,0.14)] hover:border-neutral-300",
      )}
    >
      {/* Target handle (left) — connection input. Visible on hover / when active. */}
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        isConnectable={isConnectMode}
        className={cn("scene-handle scene-handle--in", showHandles && "is-visible")}
      />

      <div className="overflow-hidden rounded-[var(--radius-card)]">
        {/* Top row: number + thumb + title */}
        <div className="flex gap-2.5 p-2.5">
          <div className="relative shrink-0">
            {cover ? (
              <ImageThumb
                id={cover.id}
                alt={scene.title}
                className="h-[58px] w-[78px] rounded-md object-cover ring-1 ring-inset ring-black/10"
              />
            ) : (
              <div className="flex h-[58px] w-[78px] items-center justify-center rounded-md bg-[var(--color-surface-2)] text-[var(--color-ink-faint)] ring-1 ring-inset ring-[var(--color-border-strong)]">
                <ImageIcon size={18} />
              </div>
            )}
            <span className="absolute -left-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[#121212] text-[10px] font-semibold tabular-nums text-white ring-2 ring-white">
              {String(index + 1).padStart(2, "0")}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className={cn("h-2 w-2 shrink-0 rounded-full", status.dot)} title={`Status: ${scene.status}`} />
              {editing ? (
                <input
                  ref={inputRef}
                  value={draft}
                  dir="auto"
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); commit(); }
                    else if (e.key === "Escape") { e.preventDefault(); cancel(); }
                  }}
                  onBlur={commit}
                  placeholder="Untitled scene"
                  className="nodrag nopan min-w-0 flex-1 rounded border border-[var(--color-border-strong)] bg-white px-1.5 py-0.5 text-[13px] font-semibold leading-tight text-[var(--color-ink)] outline-none focus:border-[var(--color-ash)]"
                />
              ) : (
                <>
                  <h3
                    onClick={(e) => {
                      if (isActive) {
                        e.stopPropagation();
                        startEditing();
                      }
                    }}
                    onDoubleClick={(e) => { e.stopPropagation(); startEditing(); }}
                    title={isActive ? "Click to rename" : "Select, then click to rename"}
                    className={cn(
                      "nodrag min-w-0 flex-1 truncate text-[13px] font-semibold leading-tight text-[var(--color-ink)]",
                      isActive && "cursor-text rounded-sm hover:bg-[var(--color-surface-2)]",
                    )}
                  >
                    {scene.title || <span className="font-normal text-[var(--color-ink-faint)]">Untitled scene</span>}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditing();
                    }}
                    title="Rename scene title"
                    aria-label="Rename scene title"
                    className={cn(
                      "nodrag nopan grid h-5 w-5 shrink-0 place-items-center rounded text-[10px] font-semibold text-[var(--color-ink-faint)] transition-opacity hover:bg-[var(--color-stone-surface)] hover:text-[var(--color-ink)]",
                      isActive || hovered ? "opacity-100" : "opacity-0",
                    )}
                  >
                    Aa
                  </button>
                </>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              <span className="flex items-center gap-1 rounded bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-ink-soft)]">
                <Clock size={10} /> {formatDuration(scene.durationSec)}
              </span>
              {videoModel && (
                <span className="flex max-w-[110px] items-center gap-1 rounded bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-ink-soft)]">
                  <Clapperboard size={10} className="shrink-0" /> <span className="truncate">{videoModel}</span>
                </span>
              )}
            </div>
          </div>

          {/* Quick edit — opens the full editor. nodrag so the press never starts a drag. */}
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(scene.id); }}
            title="Edit full scene"
            aria-label="Edit full scene"
            className="nodrag nopan h-6 w-6 shrink-0 place-items-center rounded-md text-[var(--color-ink-faint)] opacity-0 transition-opacity hover:bg-[var(--color-stone-surface)] hover:text-[var(--color-ink)] group-hover/node:opacity-100 [display:grid]"
          >
            <Pencil size={13} />
          </button>
        </div>

        {/* Previews */}
        <div className="min-h-0 flex-1 space-y-1 px-2.5">
          {promptPreview ? (
            <p className="line-clamp-2 text-[12px] leading-snug text-[var(--color-ink-soft)]">{promptPreview}</p>
          ) : (
            <p className="text-[11px] italic text-[var(--color-ink-faint)]">No prompt yet</p>
          )}
          {narrationPreview && (
            <p className="line-clamp-1 text-[11px] italic text-[var(--color-ink-faint)]">“{narrationPreview}”</p>
          )}
        </div>

        {/* Footer: role + missing badge */}
        <div className="flex items-center gap-1.5 px-2.5 pb-2.5 pt-1.5">
          {scene.role !== "none" && (
            <span className="rounded-full bg-[#121212] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
              {scene.role}
            </span>
          )}
          {gaps.length > 0 && (
            <span
              className="ml-auto flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800"
              title={`Missing: ${gaps.join(", ")}`}
            >
              <AlertTriangle size={10} />
              {gaps.length === 1 ? `Needs ${gaps[0]}` : `${gaps.length} missing`}
            </span>
          )}
        </div>
      </div>

      {/* Source handle (right) — drag from here to connect. */}
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        isConnectable={isConnectMode}
        className={cn("scene-handle scene-handle--out", showHandles && "is-visible")}
      />
    </div>
  );
}

export const SceneFlowNode = memo(SceneFlowNodeImpl);
