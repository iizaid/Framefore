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
import { essentialGaps } from "@/lib/colors";
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

  return (
    <div className="px-4 py-2.5 sm:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header row — also the collapse control */}
        <button
          onClick={onToggle}
          className="mb-2 flex w-full items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink-soft)]"
        >
          <ChevronDown size={13} className={cn("transition-transform", !open && "-rotate-90")} />
          Timeline
          <span className="ml-auto flex items-center gap-1.5 font-sans text-[11px] font-medium normal-case tracking-normal text-[var(--color-ink-soft)]">
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

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    flexGrow: grow,
    flexBasis: 0,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      title={`Scene ${String(index + 1).padStart(2, "0")}${scene.title ? ` — ${scene.title}` : ""} · ${formatDuration(scene.durationSec)} · drag to reorder`}
      className={cn(
        "group/seg relative flex min-h-12 min-w-[72px] cursor-grab touch-none select-none flex-col justify-between overflow-hidden rounded-md border px-2 py-1.5 text-left transition-colors active:cursor-grabbing sm:min-h-0 sm:min-w-[52px]",
        isDragging
          ? "border-neutral-400 bg-white text-[var(--color-ink)] shadow-lg"
          : isActive
            ? "border-neutral-900 bg-neutral-900 text-white"
          : "border-[var(--color-border-strong)] bg-white text-[var(--color-ink-soft)] hover:border-neutral-300 hover:bg-[var(--color-surface-2)]",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="absolute inset-0"
        aria-label={`Select scene ${index + 1}`}
      />
      <div className="pointer-events-none flex items-center justify-between gap-1">
        <span className="text-[11px] font-semibold tabular-nums leading-none">
          {String(index + 1).padStart(2, "0")}
        </span>
        {gaps.length > 0 && (
          <span
            className={cn("h-1.5 w-1.5 shrink-0 rounded-full", isActive && !isDragging ? "bg-white" : "bg-neutral-400")}
            title={`Missing: ${gaps.join(", ")}`}
          />
        )}
      </div>
      <span
        className={cn(
          "pointer-events-none mt-1 truncate text-[10px] font-medium leading-none",
          isActive && !isDragging ? "text-white/80" : "text-[var(--color-ink-faint)]",
        )}
      >
        {formatDuration(scene.durationSec)}
      </span>
      {isActive && (onMoveLeft || onMoveRight) && (
        <div className="relative z-10 mt-1 hidden gap-1 max-sm:flex">
          <button
            type="button"
            disabled={!onMoveLeft}
            onClick={(e) => { e.stopPropagation(); onMoveLeft?.(); }}
            className="grid h-6 flex-1 place-items-center rounded bg-white/15 text-white disabled:opacity-30"
            aria-label="Move scene left"
          >
            <ChevronLeft size={13} />
          </button>
          <button
            type="button"
            disabled={!onMoveRight}
            onClick={(e) => { e.stopPropagation(); onMoveRight?.(); }}
            className="grid h-6 flex-1 place-items-center rounded bg-white/15 text-white disabled:opacity-30"
            aria-label="Move scene right"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
