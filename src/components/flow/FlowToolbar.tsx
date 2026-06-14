import { useReactFlow } from "@xyflow/react";
import {
  Cable,
  Columns3,
  Hand,
  Maximize2,
  Minus,
  MousePointer2,
  Plus,
  RotateCcw,
  Rows3,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";
import type { CanvasToolMode } from "./flowContext";

// Floating canvas toolbar. Zoom / fit come from React Flow's imperative API;
// arrange + reset call the same store actions the old canvas used, then re-fit so
// the freshly arranged layout is framed. Rendered inside a <Panel> by FlowCanvas.
export function FlowToolbar({
  projectId,
  toolMode,
  onToolModeChange,
}: {
  projectId: string;
  toolMode: CanvasToolMode;
  onToolModeChange: (mode: CanvasToolMode) => void;
}) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const arrangeScenes = useStore((s) => s.arrangeScenes);
  const resetLayout = useStore((s) => s.resetLayout);

  const fit = () => fitView({ duration: 300, padding: 0.2, maxZoom: 1 });
  const refit = () => requestAnimationFrame(fit);

  const arrange = (axis: "vertical" | "horizontal") => {
    arrangeScenes(projectId, axis);
    refit();
  };
  const reset = () => {
    resetLayout(projectId);
    refit();
  };

  return (
    <div className="flex items-center gap-1 rounded-full border border-[var(--color-border-strong)] bg-white/95 p-1.5 shadow-[0_14px_40px_-22px_rgba(0,0,0,0.45)] backdrop-blur">
      <div className="flex items-center gap-1" aria-label="Canvas modes">
        <ToolBtn label="Select (V)" active={toolMode === "select"} onClick={() => onToolModeChange("select")}>
          <MousePointer2 size={15} />
        </ToolBtn>
        <ToolBtn label="Connect scenes (C)" active={toolMode === "connect"} onClick={() => onToolModeChange("connect")}>
          <Cable size={15} />
        </ToolBtn>
        <ToolBtn label="Pan canvas (H or Space)" active={toolMode === "pan"} onClick={() => onToolModeChange("pan")}>
          <Hand size={15} />
        </ToolBtn>
      </div>
      <div className="mx-0.5 h-5 w-px bg-[var(--color-border-strong)]" />
      <div className="flex items-center gap-1" aria-label="Canvas view">
        <ToolBtn label="Zoom out" onClick={() => zoomOut({ duration: 150 })}><Minus size={15} /></ToolBtn>
        <ToolBtn label="Zoom in" onClick={() => zoomIn({ duration: 150 })}><Plus size={15} /></ToolBtn>
        <ToolBtn label="Fit view (F)" onClick={fit}><Maximize2 size={15} /></ToolBtn>
      </div>
      <div className="mx-0.5 h-5 w-px bg-[var(--color-border-strong)]" />
      <div className="flex items-center gap-1" aria-label="Canvas layout">
        <ToolBtn label="Arrange vertical" onClick={() => arrange("vertical")}><Rows3 size={15} /></ToolBtn>
        <ToolBtn label="Arrange horizontal" onClick={() => arrange("horizontal")}><Columns3 size={15} /></ToolBtn>
        <ToolBtn label="Reset layout" onClick={reset}><RotateCcw size={15} /></ToolBtn>
      </div>
    </div>
  );
}

function ToolBtn({
  label,
  onClick,
  active = false,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-full transition-colors",
        active
          ? "bg-[#121212] text-white shadow-sm"
          : "text-[var(--color-ink-soft)] hover:bg-[var(--color-stone-surface)] hover:text-[var(--color-ink)]",
      )}
    >
      {children}
    </button>
  );
}
