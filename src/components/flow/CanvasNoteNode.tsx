import { memo, useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import type { NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { useFlowCallbacks } from "./flowContext";
import type { CanvasNoteNodeData } from "./flowContext";

function CanvasNoteNodeImpl({ id, data, selected }: NodeProps) {
  const { projectId } = useFlowCallbacks();
  const noteId = ((data ?? {}) as CanvasNoteNodeData).noteId ?? id;
  const note = useStore((s) =>
    s.projects.find((p) => p.id === projectId)?.canvasNotes?.find((n) => n.id === noteId),
  );
  const updateCanvasNote = useStore((s) => s.updateCanvasNote);
  const deleteCanvasNote = useStore((s) => s.deleteCanvasNote);
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(note?.text ?? "");
  }, [note?.text]);

  useEffect(() => {
    if (selected) textareaRef.current?.focus();
  }, [selected]);

  if (!note) return null;

  const commit = () => updateCanvasNote(projectId, noteId, { text: draft });

  return (
    <div
      className={cn(
        "group/note w-56 rounded-[10px] border bg-white/95 p-2.5 shadow-[0_10px_24px_-18px_rgba(0,0,0,0.45)] backdrop-blur",
        selected ? "border-neutral-400 ring-2 ring-neutral-900/10" : "border-[var(--color-border-strong)]",
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink-faint)]">
          Note
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteCanvasNote(projectId, noteId);
          }}
          className="nodrag nopan grid h-6 w-6 place-items-center rounded-md text-[var(--color-ink-faint)] opacity-0 transition-opacity hover:bg-rose-50 hover:text-rose-600 group-hover/note:opacity-100 focus:opacity-100"
          aria-label="Delete note"
          title="Delete note"
        >
          <Trash2 size={12} />
        </button>
      </div>
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            commit();
            textareaRef.current?.blur();
          }
        }}
        placeholder="Production note..."
        className="nodrag nopan min-h-[84px] w-full resize-none rounded-md bg-transparent text-[12px] leading-relaxed text-[var(--color-ink-soft)] outline-none placeholder:text-[var(--color-ink-faint)]"
      />
    </div>
  );
}

export const CanvasNoteNode = memo(CanvasNoteNodeImpl);
