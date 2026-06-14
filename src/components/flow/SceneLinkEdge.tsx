import { memo, useEffect, useRef, useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { Pencil, Trash2, Check } from "lucide-react";
import { useStore } from "@/store/useStore";
import { useFlowCallbacks } from "./flowContext";
import type { SceneLinkEdgeData } from "./flowContext";

// Manual workflow link: user-drawn, stored in `project.links`. Stronger visual
// weight than the order spine, selectable, with a compact toolbar (edit label /
// delete) shown only when selected. Never affects video order.
function SceneLinkEdgeImpl({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  selected,
  data,
}: EdgeProps) {
  const { projectId } = useFlowCallbacks();
  const updateLink = useStore((s) => s.updateLink);
  const deleteLink = useStore((s) => s.deleteLink);

  const d = (data ?? {}) as SceneLinkEdgeData;
  const linkId = d.linkId ?? id;
  const label = (data?.label as string | undefined) ?? "";

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(label);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  // Leaving label-edit mode when the edge is deselected avoids a stranded input.
  useEffect(() => {
    if (!selected) setEditing(false);
  }, [selected]);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const commitLabel = () => {
    updateLink(projectId, linkId, { label: draft.trim() || undefined });
    setEditing(false);
  };

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: selected ? "rgba(18,18,18,0.95)" : "rgba(18,18,18,0.55)",
          strokeWidth: selected ? 2.5 : 2,
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan absolute"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
        >
          {selected ? (
            <div className="flex items-center gap-1 rounded-full border border-[var(--color-border-strong)] bg-white px-1 py-0.5 shadow-md">
              {editing ? (
                <>
                  <input
                    ref={inputRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); commitLabel(); }
                      else if (e.key === "Escape") { e.preventDefault(); setEditing(false); }
                    }}
                    onBlur={commitLabel}
                    placeholder="Label…"
                    className="h-5 w-24 rounded border border-[var(--color-border-strong)] bg-white px-1.5 text-[11px] text-[var(--color-ink)] outline-none focus:border-[var(--color-ash)]"
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); commitLabel(); }}
                    title="Save label"
                    aria-label="Save label"
                    className="grid h-5 w-5 place-items-center rounded-full text-[var(--color-ink-soft)] hover:bg-[var(--color-stone-surface)] hover:text-[var(--color-ink)]"
                  >
                    <Check size={12} />
                  </button>
                </>
              ) : (
                <>
                  {label.trim() && (
                    <span className="max-w-[140px] truncate px-1.5 text-[11px] font-medium text-[var(--color-ink-soft)]">
                      {label}
                    </span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditing(true); }}
                    title="Edit label"
                    aria-label="Edit label"
                    className="grid h-5 w-5 place-items-center rounded-full text-[var(--color-ink-soft)] hover:bg-[var(--color-stone-surface)] hover:text-[var(--color-ink)]"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteLink(projectId, linkId); }}
                    title="Delete connection"
                    aria-label="Delete connection"
                    className="grid h-5 w-5 place-items-center rounded-full text-[var(--color-ink-soft)] hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 size={11} />
                  </button>
                </>
              )}
            </div>
          ) : (
            label.trim() && (
              <span className="inline-flex max-w-[160px] items-center rounded-full border border-[var(--color-border-strong)] bg-white px-2 py-0.5 text-[10px] font-medium text-[var(--color-ink-soft)] shadow-sm">
                <span className="truncate">{label}</span>
              </span>
            )
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const SceneLinkEdge = memo(SceneLinkEdgeImpl);
