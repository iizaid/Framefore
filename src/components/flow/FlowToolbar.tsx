import { useState } from "react";
import { useReactFlow } from "@xyflow/react";
import {
  Cable,
  CircleHelp,
  Columns3,
  Frame,
  Hand,
  Maximize2,
  MoreHorizontal,
  Minus,
  MousePointer2,
  Plus,
  RotateCcw,
  Rows3,
  StickyNote,
  Redo2,
  Undo2,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";
import { CANVAS_SHORTCUTS } from "@/lib/shortcuts";
import type { CanvasToolMode } from "./flowContext";

// Floating canvas toolbar. Zoom / fit come from React Flow's imperative API;
// arrange + reset call the same store actions the old canvas used, then re-fit so
// the freshly arranged layout is framed. Rendered inside a <Panel> by FlowCanvas.
export function FlowToolbar({
  projectId,
  toolMode,
  shortcutsOpen,
  onShortcutsOpenChange,
  onToolModeChange,
}: {
  projectId: string;
  toolMode: CanvasToolMode;
  shortcutsOpen: boolean;
  onShortcutsOpenChange: (open: boolean) => void;
  onToolModeChange: (mode: CanvasToolMode) => void;
}) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const arrangeScenes = useStore((s) => s.arrangeScenes);
  const resetLayout = useStore((s) => s.resetLayout);
  const undoCanvas = useStore((s) => s.undoCanvas);
  const redoCanvas = useStore((s) => s.redoCanvas);
  const canUndo = useStore((s) => (s.canvasHistory[projectId]?.past.length ?? 0) > 0);
  const canRedo = useStore((s) => (s.canvasHistory[projectId]?.future.length ?? 0) > 0);
  const [moreOpen, setMoreOpen] = useState(false);

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
    <div className="relative flex items-center gap-1 rounded-full border border-[var(--color-border-strong)] bg-white/95 p-1.5 shadow-[0_14px_40px_-22px_rgba(0,0,0,0.45)] backdrop-blur max-sm:gap-0.5 max-sm:p-2">
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
      <div className="flex items-center gap-1" aria-label="Canvas create tools">
        <ToolBtn label="Scene tool (S or A)" active={toolMode === "scene"} onClick={() => onToolModeChange("scene")}>
          <Plus size={15} />
        </ToolBtn>
        <ToolBtn label="Note tool (N)" active={toolMode === "note"} className="max-sm:hidden" onClick={() => onToolModeChange("note")}>
          <StickyNote size={15} />
        </ToolBtn>
        <ToolBtn label="Section tool (G)" active={toolMode === "section"} className="max-sm:hidden" onClick={() => onToolModeChange("section")}>
          <Frame size={15} />
        </ToolBtn>
      </div>
      <div className="mx-0.5 h-5 w-px bg-[var(--color-border-strong)] max-sm:hidden" />
      <div className="flex items-center gap-1" aria-label="Canvas view">
        <ToolBtn label="Zoom out" className="max-sm:hidden" onClick={() => zoomOut({ duration: 150 })}><Minus size={15} /></ToolBtn>
        <ToolBtn label="Zoom in" className="max-sm:hidden" onClick={() => zoomIn({ duration: 150 })}><Plus size={15} /></ToolBtn>
        <ToolBtn label="Fit view (F)" onClick={fit}><Maximize2 size={15} /></ToolBtn>
      </div>
      <div className="mx-0.5 h-5 w-px bg-[var(--color-border-strong)] max-sm:hidden" />
      <div className="flex items-center gap-1" aria-label="Canvas history">
        <ToolBtn label="Undo (Ctrl/Cmd+Z)" disabled={!canUndo} onClick={() => undoCanvas(projectId)}><Undo2 size={15} /></ToolBtn>
        <ToolBtn label="Redo (Ctrl/Cmd+Shift+Z or Ctrl+Y)" disabled={!canRedo} onClick={() => redoCanvas(projectId)}><Redo2 size={15} /></ToolBtn>
      </div>
      <div className="mx-0.5 h-5 w-px bg-[var(--color-border-strong)] max-sm:hidden" />
      <div className="flex items-center gap-1 max-sm:hidden" aria-label="Canvas layout">
        <ToolBtn label="Arrange vertical" onClick={() => arrange("vertical")}><Rows3 size={15} /></ToolBtn>
        <ToolBtn label="Arrange horizontal" onClick={() => arrange("horizontal")}><Columns3 size={15} /></ToolBtn>
        <ToolBtn label="Reset layout" onClick={reset}><RotateCcw size={15} /></ToolBtn>
      </div>
      <ToolBtn
        label="Shortcuts (?)"
        active={shortcutsOpen}
        onClick={() => onShortcutsOpenChange(!shortcutsOpen)}
      >
        <CircleHelp size={15} />
      </ToolBtn>
      {shortcutsOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-72 overflow-hidden rounded-xl border border-[var(--color-border-strong)] bg-white p-2 text-sm shadow-xl">
          <div className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-faint)]">
            Shortcuts
          </div>
          <div className="max-h-[60vh] overflow-auto">
            {CANVAS_SHORTCUTS.map((shortcut) => (
              <div key={shortcut.label} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-[12px]">
                <span className="text-[var(--color-ink-soft)]">{shortcut.label}</span>
                <span className="flex shrink-0 items-center gap-1">
                  {shortcut.keys.map((key) => (
                    <kbd
                      key={key}
                      className="rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-ink-faint)]"
                    >
                      {key}
                    </kbd>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="hidden max-sm:block">
        <ToolBtn label="More canvas tools" active={moreOpen} onClick={() => setMoreOpen((o) => !o)}>
          <MoreHorizontal size={16} />
        </ToolBtn>
        {moreOpen && (
          <div className="absolute bottom-full right-0 mb-2 w-44 overflow-hidden rounded-xl border border-[var(--color-border-strong)] bg-white py-1 text-sm shadow-xl">
            <MenuBtn label="Note tool" onClick={() => { setMoreOpen(false); onToolModeChange("note"); }}><StickyNote size={15} /></MenuBtn>
            <MenuBtn label="Section tool" onClick={() => { setMoreOpen(false); onToolModeChange("section"); }}><Frame size={15} /></MenuBtn>
            <div className="my-1 h-px bg-[var(--color-border-strong)]" />
            <MenuBtn label="Arrange vertical" onClick={() => { setMoreOpen(false); arrange("vertical"); }}><Rows3 size={15} /></MenuBtn>
            <MenuBtn label="Arrange horizontal" onClick={() => { setMoreOpen(false); arrange("horizontal"); }}><Columns3 size={15} /></MenuBtn>
            <MenuBtn label="Reset layout" onClick={() => { setMoreOpen(false); reset(); }}><RotateCcw size={15} /></MenuBtn>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolBtn({
  label,
  onClick,
  active = false,
  disabled = false,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-full transition-colors",
        disabled
          ? "cursor-not-allowed text-[var(--color-ink-faint)] opacity-35"
          : active
            ? "bg-[#121212] text-white shadow-sm"
            : "text-[var(--color-ink-soft)] hover:bg-[var(--color-stone-surface)] hover:text-[var(--color-ink)]",
        className,
      )}
    >
      {children}
    </button>
  );
}

function MenuBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex min-h-10 w-full items-center gap-2 px-3 text-left text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
    >
      {children}
      <span>{label}</span>
    </button>
  );
}
