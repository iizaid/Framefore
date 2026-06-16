import { AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, Clock, Film } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Project, Scene } from "@/types";
import { cn, formatDuration } from "@/lib/utils";
import { essentialGaps, sceneColor } from "@/lib/colors";
import { getAutoSceneColor } from "@/lib/sceneColors";
import { totalSceneSeconds } from "@/lib/estimate";

// Editor-style production strip docked under the board. Each segment remains
// proportional to duration and draggable through the same store reorder, so
// `project.scenes` stays the single source of truth for video/export order.
export function TimelineStrip({
  project,
  activeId,
  open,
  onToggle,
  onSelect,
  onReorder,
}: {
  project: Project;
  activeId: string | null;
  open: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
  onReorder: (fromId: string, toId: string) => void;
}) {
  const scenes = project.scenes;
  const total = totalSceneSeconds(scenes);

  // Same activation distance as the board, so a small movement is a click
  // (select/scroll) and a real drag is a reorder — no accidental editor opens.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      onReorder(String(active.id), String(over.id));
    }
  };

  /* Docked timeline wrapper — compact editor rail, not a pale empty strip. */
  return (
    <div className="bg-[var(--ff-blue-chalk)] px-3 py-3 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <button
          onClick={onToggle}
          className="mb-2 flex w-full items-center gap-2 rounded-[var(--radius-button)] px-1 text-left text-[12px] font-semibold text-[var(--ff-ink)] transition-colors hover:text-[var(--ff-violet)]"
        >
          <ChevronDown size={13} className={cn("transition-transform", !open && "-rotate-90")} />
          <span className="flex items-center gap-1.5">
            <Film size={13} className="text-[var(--ff-violet)]" />
            Timeline order
          </span>
          <span className="ml-auto flex items-center gap-1.5 font-mono-ui text-[11px] font-medium text-[var(--color-ink-faint)]">
            <Clock size={11} />
            {formatDuration(total)} · {scenes.length} scene{scenes.length === 1 ? "" : "s"}
          </span>
        </button>

        {open && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={scenes.map((s) => s.id)} strategy={horizontalListSortingStrategy}>
              <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-2 shadow-[var(--ff-shadow-card)]">
                <div className="no-scrollbar flex items-stretch gap-1.5 overflow-x-auto">
                {scenes.map((scene, i) => (
                  <TimelineSegment
                    key={scene.id}
                    scene={scene}
                    index={i}
                    isActive={scene.id === activeId}
                    onSelect={() => onSelect(scene.id)}
                    onMoveLeft={i > 0 ? () => onReorder(scene.id, scenes[i - 1].id) : undefined}
                    onMoveRight={i < scenes.length - 1 ? () => onReorder(scene.id, scenes[i + 1].id) : undefined}
                  />
                ))}
                </div>
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}

function TimelineSegment({
  scene,
  index,
  isActive,
  onSelect,
  onMoveLeft,
  onMoveRight,
}: {
  scene: Scene;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: scene.id });
  const gaps = essentialGaps(scene);
  const grow = Math.max(scene.durationSec, 1);

  const autoColor = getAutoSceneColor(scene.id, index);
  const userColor = scene.color !== "none" ? sceneColor(scene.color) : null;
  const accent = userColor ? userColor.hex : autoColor.accent;
  const segmentSoftBg = userColor ? `color-mix(in srgb, ${accent} 12%, #ffffff)` : autoColor.soft;
  const segmentBorder = userColor ? `color-mix(in srgb, ${accent} 36%, var(--color-border))` : autoColor.border;
  const textColor = userColor ? "var(--ff-ink)" : autoColor.text;

  const dndStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    flexGrow: grow,
    flexBasis: 0,
    zIndex: isDragging ? 50 : undefined,
  };

  // Inline style for the segment container — safe from Tailwind purging
  const segmentInlineStyle: React.CSSProperties = {
    ...dndStyle,
    borderColor: isDragging ? accent : isActive ? accent : segmentBorder,
    backgroundColor: isDragging ? "var(--color-surface)" : segmentSoftBg,
    borderTopWidth: 3,
    borderTopColor: isDragging ? undefined : accent,
    borderTopStyle: "solid",
    boxShadow: isActive ? `0 0 0 1px ${accent}, 0 10px 24px -18px rgba(24,16,43,0.34)` : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={segmentInlineStyle}
      {...attributes}
      {...listeners}
      title={`Scene ${String(index + 1).padStart(2, "0")}${scene.title ? ` — ${scene.title}` : ""} · ${formatDuration(scene.durationSec)} · drag to reorder`}
      className={cn(
        "group/seg relative flex min-h-[66px] min-w-[118px] cursor-grab touch-none select-none flex-col overflow-hidden rounded-[var(--radius-button)] border px-2.5 py-2 text-left transition-[box-shadow,transform,border-color] active:cursor-grabbing sm:min-w-[96px]",
        "hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-22px_rgba(24,16,43,0.35)]",
        isDragging && "scale-[1.01] shadow-lg",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="absolute inset-0"
        aria-label={`Select scene ${index + 1}`}
      />
      <div
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent }}
      />
      <div className="pointer-events-none flex items-center justify-between gap-1 pt-0.5">
        <span
          style={{ backgroundColor: accent, color: accent === "#F0E100" ? "var(--ff-haiti)" : "#ffffff" }}
          className="font-mono-ui grid h-5 min-w-5 place-items-center rounded-md px-1 text-[10px] font-semibold tabular-nums leading-none"
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        {gaps.length > 0 && (
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--ff-yellow-soft)] text-[var(--ff-haiti)] ring-1 ring-inset ring-[var(--ff-yellow-border)]"
            title={`Missing: ${gaps.join(", ")}`}
          >
            <AlertTriangle size={11} />
          </span>
        )}
      </div>
      <span
        style={{ color: textColor }}
        className="pointer-events-none mt-1.5 truncate text-[11px] font-semibold leading-tight"
      >
        {scene.title || "Untitled scene"}
      </span>
      <span className="font-mono-ui pointer-events-none mt-auto truncate text-[10px] font-medium leading-none text-[var(--color-ink-faint)]">
        {formatDuration(scene.durationSec)}
      </span>
      {isActive && (onMoveLeft || onMoveRight) && (
        <div className="relative z-10 mt-1 hidden gap-1 max-sm:flex">
          <button
            type="button"
            disabled={!onMoveLeft}
            onClick={(e) => { e.stopPropagation(); onMoveLeft?.(); }}
            style={{ background: `${accent}30` }}
            className="grid h-6 flex-1 place-items-center rounded disabled:opacity-30"
            aria-label="Move scene left"
          >
            <ChevronLeft size={13} style={{ color: accent }} />
          </button>
          <button
            type="button"
            disabled={!onMoveRight}
            onClick={(e) => { e.stopPropagation(); onMoveRight?.(); }}
            style={{ background: `${accent}30` }}
            className="grid h-6 flex-1 place-items-center rounded disabled:opacity-30"
            aria-label="Move scene right"
          >
            <ChevronRight size={13} style={{ color: accent }} />
          </button>
        </div>
      )}
    </div>
  );
}
