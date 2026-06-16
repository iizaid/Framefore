import { useEffect, useRef, useState } from "react";
import { Clock, Clapperboard, ImageIcon, AlertTriangle, Pencil } from "lucide-react";
import type { Project, Scene } from "@/types";
import { cn, formatDuration } from "@/lib/utils";
import { resolvedVideoModel } from "@/lib/models";
import { essentialGaps, sceneColor } from "@/lib/colors";
import { getAutoSceneColor } from "@/lib/sceneColors";
import { STATUS_STYLE } from "@/lib/constants";
import { CANVAS_CARD_H, CANVAS_CARD_W } from "@/store/useStore";
import { ImageThumb } from "./ui/widgets";

// Compact, fixed-size production card for the whiteboard canvas. Purely visual —
// it never edits the scene. Selection + dragging are handled by the parent
// CanvasBoard; full editing happens in the inspector / editor modal.
export function CanvasCard({
  scene,
  index,
  project,
  isActive,
  isDragging,
  onEdit,
  onRename,
}: {
  scene: Scene;
  index: number;
  project: Project;
  isActive: boolean;
  isDragging: boolean;
  onEdit: () => void;
  onRename: (title: string) => void;
}) {
  // Inline title editing — keeps the user on the canvas instead of opening the
  // full editor for a quick rename.
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(scene.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(scene.title);
      // Focus + select on the next frame so the field is ready.
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const commit = () => {
    onRename(draft.trim());
    setEditing(false);
  };
  const cancel = () => setEditing(false);

  const cover = scene.images[0];
  const gaps = essentialGaps(scene);
  const status = STATUS_STYLE[scene.status];
  const videoModel = resolvedVideoModel(scene, project);
  const promptPreview = scene.visualPrompt.trim() || scene.summary.trim();
  const narrationPreview = scene.narrationPart.trim();

  // Resolve accent: respect user-assigned color label; fall back to the stable
  // Framefore auto palette only for scenes left as "none".
  const autoColor = getAutoSceneColor(scene.id, index);
  const userColor = scene.color !== "none" ? sceneColor(scene.color) : null;
  const accent = userColor ? userColor.hex : autoColor.accent;
  const softAccent = userColor ? "var(--color-surface-2)" : autoColor.soft;
  const accentBorder = userColor ? "var(--color-border-strong)" : autoColor.border;

  return (
    <div
      style={{
        width: CANVAS_CARD_W,
        height: CANVAS_CARD_H,
        borderColor: isActive ? accent : accentBorder,
      }}
      className={cn(
        "group/cv flex select-none flex-col overflow-hidden rounded-[var(--radius-card)] border bg-[var(--color-surface)] transition-shadow duration-150",
        isDragging
          ? "shadow-[0_18px_40px_-12px_rgba(24,16,43,0.26)]"
          : isActive
            ? "shadow-[0_12px_28px_-16px_rgba(24,16,43,0.30)] ring-2 ring-[var(--color-accent-glow)]"
            : "shadow-[var(--ff-shadow-card)] hover:shadow-[0_14px_34px_-24px_rgba(18,43,165,0.18)]",
      )}
    >
      {/* Colored top accent rail */}
      <div style={{ height: 3, background: accent, flexShrink: 0 }} />
      {/* Top row: number + thumb + title */}
      <div className="flex gap-2.5 p-2.5">
        <div className="relative shrink-0">
          {cover ? (
            <ImageThumb id={cover.id} alt={scene.title} className="h-[58px] w-[78px] rounded-md object-cover ring-1 ring-inset ring-black/10" />
          ) : (
            <div
              style={{ backgroundColor: softAccent, boxShadow: `inset 0 0 0 1px ${accentBorder}` }}
              className="flex h-[58px] w-[78px] items-center justify-center rounded-md text-[var(--color-ink-faint)]"
            >
              <ImageIcon size={18} />
            </div>
          )}
          <span
            style={{ background: accent }}
            className="absolute -left-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full text-[10px] font-semibold tabular-nums text-white ring-2 ring-[var(--color-surface)]"
          >
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
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); commit(); }
                  else if (e.key === "Escape") { e.preventDefault(); cancel(); }
                }}
                onBlur={commit}
                placeholder="Untitled scene"
                className="min-w-0 flex-1 rounded border border-[var(--color-border-strong)] bg-white px-1.5 py-0.5 text-[13px] font-semibold leading-tight text-[var(--color-ink)] outline-none focus:border-[var(--ff-violet)]"
              />
            ) : (
              <h3
                onPointerDown={(e) => e.stopPropagation()}
                onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
                title="Double-click to rename"
                className="truncate text-[13px] font-semibold leading-tight text-[var(--color-ink)]"
              >
                {scene.title || <span className="font-normal text-[var(--color-ink-faint)]">Untitled scene</span>}
              </h3>
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

        {/* Quick edit — opens the full editor; stops drag/select */}
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          title="Edit full scene"
          aria-label="Edit full scene"
          className="h-6 w-6 shrink-0 place-items-center rounded-md text-[var(--color-ink-faint)] opacity-0 transition-opacity hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)] group-hover/cv:opacity-100 [display:grid]"
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
          <span className="rounded-full bg-[var(--ff-haiti)] px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white">
            {scene.role}
          </span>
        )}
        {gaps.length > 0 && (
          <span
            className="ml-auto flex items-center gap-1 rounded-full bg-[var(--ff-yellow-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--ff-haiti)] ring-1 ring-inset ring-[#F0E100]/60"
            title={`Missing: ${gaps.join(", ")}`}
          >
            <AlertTriangle size={10} />
            {gaps.length === 1 ? `Needs ${gaps[0]}` : `${gaps.length} missing`}
          </span>
        )}
      </div>
    </div>
  );
}
