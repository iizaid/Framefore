import { useReactFlow } from "@xyflow/react";
import { Maximize2, Rows3, Columns3, RotateCcw, Plus, Minus } from "lucide-react";
import { useStore } from "@/store/useStore";

// Floating canvas toolbar. Zoom / fit come from React Flow's imperative API;
// arrange + reset call the same store actions the old canvas used, then re-fit so
// the freshly arranged layout is framed. Rendered inside a <Panel> by FlowCanvas.
export function FlowToolbar({ projectId }: { projectId: string }) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const arrangeScenes = useStore((s) => s.arrangeScenes);
  const resetLayout = useStore((s) => s.resetLayout);

  const refit = () => requestAnimationFrame(() => fitView({ duration: 300, padding: 0.2 }));

  const arrange = (axis: "vertical" | "horizontal") => {
    arrangeScenes(projectId, axis);
    refit();
  };
  const reset = () => {
    resetLayout(projectId);
    refit();
  };

  return (
    <div className="flex items-center gap-1 rounded-full border border-[var(--color-border-strong)] bg-white/90 p-1 shadow-sm backdrop-blur">
      <ToolBtn label="Zoom out" onClick={() => zoomOut({ duration: 150 })}><Minus size={15} /></ToolBtn>
      <ToolBtn label="Zoom in" onClick={() => zoomIn({ duration: 150 })}><Plus size={15} /></ToolBtn>
      <div className="mx-0.5 h-5 w-px bg-[var(--color-border-strong)]" />
      <ToolBtn label="Fit view" onClick={() => fitView({ duration: 300, padding: 0.2 })}><Maximize2 size={15} /></ToolBtn>
      <ToolBtn label="Arrange vertical" onClick={() => arrange("vertical")}><Rows3 size={15} /></ToolBtn>
      <ToolBtn label="Arrange horizontal" onClick={() => arrange("horizontal")}><Columns3 size={15} /></ToolBtn>
      <ToolBtn label="Reset layout" onClick={reset}><RotateCcw size={15} /></ToolBtn>
    </div>
  );
}

function ToolBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="grid h-7 w-7 place-items-center rounded-full text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-stone-surface)] hover:text-[var(--color-ink)]"
    >
      {children}
    </button>
  );
}
