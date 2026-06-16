import { Clock, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
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

// Clean monochrome "production overview" docked under the board. Each scene is a
// segment whose width is proportional to its duration. Segments are draggable:
// reordering them calls the SAME store reorder as the cards, so the two views can
// never drift — `project.scenes` stays the single source of truth.
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

  /* Docked timeline wrapper — Blue Chalk/Paper surface, not pure white. */
  return (
    <div className="px-4 py-2.5 sm:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header row — also the collapse control */}
        <button
          onClick={onToggle}
          className="mb-2 flex w-full items-center gap-2 text-[11px] font-semibold uppercase text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink-soft)]"
        >
          <ChevronDown size={13} className={cn("transition-transform", !open && "-rotate-90")} />
          Timeline
          <span className="ml-auto flex items-center gap-1.5 font-sans text-[11px] font-medium normal-case text-[var(--color-ink-soft)]">
            <Clock size={11} className="text-[var(--color-ink-faint)]" />
            {formatDuration(total)} · {scenes.length} scene{scenes.length === 1 ? "" : "s"}
          </span>
        </button>

        {/* Segments */}
        {open && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={scenes.map((s) => s.id)} strategy={horizontalListSortingStrategy}>
              <div className="no-scrollbar -mx-1 flex items-stretch gap-1 overflow-x-auto px-1">
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

  // Resolve scene accent — same logic as CanvasCard so card ↔ timeline always match.
  const autoColor = getAutoSceneColor(scene.id, index);
  const userColor = scene.color !== "none" ? sceneColor(scene.color) : null;
  const accent = userColor ? userColor.hex : autoColor.accent;
  // softBg from userColor is a Tailwind class name; for inline style we use autoColor.soft for auto ones.
  const segmentSoftBg = userColor ? undefined : autoColor.soft;
  const segmentBorder = userColor ? undefined : autoColor.border;

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
    borderColor: isDragging
      ? undefined
      : isActive
        ? accent
        : segmentBorder ?? undefined,
    backgroundColor: isDragging
      ? "var(--color-surface)"
      : isActive
        ? segmentSoftBg ?? "var(--color-surface)"
        : segmentSoftBg ?? "var(--color-surface)",
    borderTopWidth: 2,
    borderTopColor: isDragging ? undefined : accent,
    borderTopStyle: "solid",
  };

  return (
    <div
      ref={setNodeRef}
      style={segmentInlineStyle}
      {...attributes}
      {...listeners}
      title={`Scene ${String(index + 1).padStart(2, "0")}${scene.title ? ` — ${scene.title}` : ""} · ${formatDuration(scene.durationSec)} · drag to reorder`}
      className={cn(
        "group/seg relative flex min-h-12 min-w-[72px] cursor-grab touch-none select-none flex-col justify-between overflow-hidden rounded-md border px-2 py-1.5 text-left transition-colors active:cursor-grabbing sm:min-h-0 sm:min-w-[52px]",
        isDragging && "shadow-lg",
        isActive && "ring-1",
        userColor && !isActive && !isDragging && userColor.segment,
        userColor && isActive && "bg-white",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="absolute inset-0"
        aria-label={`Select scene ${index + 1}`}
      />
      {/* Colored top border accent strip */}
      <div
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: accent }}
      />
      <div className="pointer-events-none flex items-center justify-between gap-1 pt-1">
        <span
          style={{ color: isActive ? accent : "var(--color-ink-soft)" }}
          className="text-[11px] font-semibold tabular-nums leading-none"
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        {gaps.length > 0 && (
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ff-yellow)] ring-1 ring-[var(--ff-haiti)]/20"
            title={`Missing: ${gaps.join(", ")}`}
          />
        )}
      </div>
      <span className="pointer-events-none mt-1 truncate text-[10px] font-medium leading-none text-[var(--color-ink-faint)]">
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
