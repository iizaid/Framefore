import { memo, useEffect, useRef, useState } from "react";
import { FilePlus2, Trash2 } from "lucide-react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { useFlowCallbacks } from "./flowContext";
import type { CanvasNoteNodeData } from "./flowContext";
import type { CanvasNoteKind } from "@/types";

const NOTE_KINDS: { value: CanvasNoteKind; label: string }[] = [
  { value: "idea", label: "Idea" },
  { value: "todo", label: "Todo" },
  { value: "fix", label: "Fix" },
  { value: "reference", label: "Reference" },
];

function CanvasNoteNodeImpl({ id, data, selected }: NodeProps) {
  const { projectId, toolMode, onSelect } = useFlowCallbacks();
  const noteId = ((data ?? {}) as CanvasNoteNodeData).noteId ?? id;
  const note = useStore((s) =>
    s.projects.find((p) => p.id === projectId)?.canvasNotes?.find((n) => n.id === noteId),
  );
  const updateCanvasNote = useStore((s) => s.updateCanvasNote);
  const deleteCanvasNote = useStore((s) => s.deleteCanvasNote);
  const addCanvasScene = useStore((s) => s.addCanvasScene);
  const updateScene = useStore((s) => s.updateScene);
  const [draft, setDraft] = useState("");
  const [hovered, setHovered] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(note?.text ?? "");
  }, [note?.text]);

  useEffect(() => {
    if (selected) textareaRef.current?.focus();
  }, [selected]);

  if (!note) return null;

  const commit = () => {
    if (draft !== note.text) updateCanvasNote(projectId, noteId, { text: draft });
  };
  const showHandles = hovered || selected || toolMode === "connect";
  const isConnectMode = toolMode === "connect";
  const kind = note.kind ?? "idea";

  const createSceneFromNote = () => {
    const text = draft.trim() || note.text.trim();
    if (draft !== note.text) updateCanvasNote(projectId, noteId, { text: draft });
    const createdId = addCanvasScene(projectId, Math.round(note.x + 300), Math.round(note.y));
    if (!createdId) return;

    const firstLine = text.split(/\r?\n/).find((line) => line.trim())?.trim();
    updateScene(projectId, createdId, {
      title: firstLine ? firstLine.slice(0, 48) : "Scene from note",
      summary: text,
      visualPrompt: text,
    });
    onSelect(createdId);
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "group/note relative w-56 overflow-visible rounded-[10px] border bg-white/95 p-2.5 shadow-[0_10px_24px_-18px_rgba(0,0,0,0.45)] backdrop-blur",
        selected ? "border-neutral-400 ring-2 ring-neutral-900/10" : "border-[var(--color-border-strong)]",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        isConnectable={isConnectMode}
        className={cn("scene-handle note-handle note-handle--in", showHandles && "is-visible")}
      />
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <select
          value={kind}
          onChange={(e) => {
            const nextKind = e.target.value as CanvasNoteKind;
            if (nextKind !== kind) updateCanvasNote(projectId, noteId, { kind: nextKind });
          }}
          className="font-mono-ui nodrag nopan h-6 max-w-[104px] rounded-full border border-[var(--color-border-strong)] bg-white px-2 text-[10px] font-semibold uppercase text-[var(--color-ink-faint)] outline-none hover:bg-[var(--color-surface-2)]"
          aria-label="Note type"
          title="Note type"
        >
          {NOTE_KINDS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover/note:opacity-100 focus-within:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              createSceneFromNote();
            }}
            className="nodrag nopan grid h-6 w-6 place-items-center rounded-md text-[var(--color-ink-faint)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
            aria-label="Create scene from note"
            title="Create scene from note"
          >
            <FilePlus2 size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteCanvasNote(projectId, noteId);
            }}
            className="nodrag nopan grid h-6 w-6 place-items-center rounded-md text-[var(--color-ink-faint)] hover:bg-rose-50 hover:text-rose-600"
            aria-label="Delete note"
            title="Delete note"
          >
            <Trash2 size={12} />
          </button>
        </div>
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
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        isConnectable={isConnectMode}
        className={cn("scene-handle note-handle note-handle--out", showHandles && "is-visible")}
      />
    </div>
  );
}

export const CanvasNoteNode = memo(CanvasNoteNodeImpl);
