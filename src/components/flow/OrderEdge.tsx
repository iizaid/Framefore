import { memo, useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { CornerDownRight, Plus } from "lucide-react";
import { useStore } from "@/store/useStore";
import { useFlowCallbacks } from "./flowContext";
import type { OrderEdgeData } from "./flowContext";

// Video-order connector: auto-generated from `project.scenes` adjacency. Locked
// (not selectable / not deletable) and styled subtly so it reads as "the spine"
// rather than a user relationship. Shows the source scene's transitionToNext
// label when present, and a hover "+" that inserts a real scene between the two.
function OrderEdgeImpl({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data,
}: EdgeProps) {
  const { projectId } = useFlowCallbacks();
  const addScene = useStore((s) => s.addScene);
  const [hovered, setHovered] = useState(false);

  const d = (data ?? {}) as OrderEdgeData;
  const label = data?.label as string | undefined;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: "rgba(18,18,18,0.20)",
          strokeWidth: 1.5,
          strokeDasharray: "5 5",
        }}
      />
      {/* Wide transparent hit area so hover (for the + button) is easy to trigger. */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="react-flow__edge-interaction"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan absolute flex items-center gap-1"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {label?.trim() && (
            <span className="inline-flex max-w-[180px] items-center gap-1 rounded-full border border-[var(--color-border-strong)] bg-white px-2 py-0.5 text-[10px] font-medium text-[var(--color-ink-faint)] shadow-sm">
              <CornerDownRight size={10} className="shrink-0" />
              <span className="truncate">{label}</span>
            </span>
          )}
          {hovered && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                addScene(projectId, d.fromIndex + 1);
              }}
              title="Add a scene between these two"
              aria-label="Add scene between"
              className="grid h-5 w-5 place-items-center rounded-full border border-[var(--color-border-strong)] bg-white text-[var(--color-ink-soft)] shadow-sm transition-colors hover:bg-neutral-900 hover:text-white"
            >
              <Plus size={12} />
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const OrderEdge = memo(OrderEdgeImpl);
