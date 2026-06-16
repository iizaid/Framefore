import { memo, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import type { NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { useFlowCallbacks } from "./flowContext";
import type { CanvasSectionNodeData } from "./flowContext";

function CanvasSectionNodeImpl({ id, data, selected }: NodeProps) {
  const { projectId } = useFlowCallbacks();
  const sectionId = ((data ?? {}) as CanvasSectionNodeData).sectionId ?? id;
  const section = useStore((s) =>
    s.projects.find((p) => p.id === projectId)?.canvasSections?.find((sec) => sec.id === sectionId),
  );
  const updateCanvasSection = useStore((s) => s.updateCanvasSection);
  const deleteCanvasSection = useStore((s) => s.deleteCanvasSection);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setDraft(section?.title ?? "");
  }, [section?.title]);

  if (!section) return null;

  const commit = () => updateCanvasSection(projectId, sectionId, { title: draft.trim() || "Section" });

  return (
    <div
      className={cn(
        "group/section h-full w-full rounded-[14px] border border-dashed bg-white/35 p-3 backdrop-blur-[1px]",
        selected ? "border-neutral-400 ring-2 ring-neutral-900/10" : "border-neutral-300/80",
      )}
    >
      <div className="flex items-start gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
              e.currentTarget.blur();
            }
          }}
          className="font-mono-ui nodrag nopan min-w-0 flex-1 bg-transparent text-[12px] font-semibold uppercase text-[var(--color-ink-faint)] outline-none"
          aria-label="Section title"
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteCanvasSection(projectId, sectionId);
          }}
          className="nodrag nopan grid h-7 w-7 shrink-0 place-items-center rounded-md text-[var(--color-ink-faint)] opacity-0 transition-opacity hover:bg-rose-50 hover:text-rose-600 group-hover/section:opacity-100 focus:opacity-100"
          aria-label="Delete section"
          title="Delete section"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

export const CanvasSectionNode = memo(CanvasSectionNodeImpl);
