import { Clock, ChevronDown } from "lucide-react";
import type { Project } from "@/types";
import { cn, formatDuration } from "@/lib/utils";
import { essentialGaps } from "@/lib/colors";
import { totalSceneSeconds } from "@/lib/estimate";

// Clean monochrome "production overview" docked under the board. Each scene is a
// segment whose width is proportional to its duration (with a readable minimum).
// Clicking a segment selects + scrolls to that scene above. Supporting tool — not
// the focus — so it stays black/white/gray to match the workspace theme.
export function TimelineStrip({
  project,
  activeId,
  open,
  onToggle,
  onSelect,
}: {
  project: Project;
  activeId: string | null;
  open: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
}) {
  const scenes = project.scenes;
  const total = totalSceneSeconds(scenes);

  return (
    <div className="px-4 py-2.5 sm:px-8">
      <div className="mx-auto max-w-5xl">
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
          <div className="flex items-stretch gap-1">
            {scenes.map((scene, i) => {
              const gaps = essentialGaps(scene);
              const isActive = scene.id === activeId;
              const grow = Math.max(scene.durationSec, 1);
              return (
                <button
                  key={scene.id}
                  onClick={() => onSelect(scene.id)}
                  title={`Scene ${String(i + 1).padStart(2, "0")}${scene.title ? ` — ${scene.title}` : ""} · ${formatDuration(scene.durationSec)}`}
                  style={{ flexGrow: grow, flexBasis: 0 }}
                  className={cn(
                    "group/seg relative flex min-w-[52px] flex-col justify-between overflow-hidden rounded-md border px-2 py-1.5 text-left transition-all",
                    isActive
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-[var(--color-border-strong)] bg-white text-[var(--color-ink-soft)] hover:border-neutral-300 hover:bg-[var(--color-surface-2)]",
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-semibold tabular-nums leading-none">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {gaps.length > 0 && (
                      <span
                        className={cn("h-1.5 w-1.5 shrink-0 rounded-full", isActive ? "bg-white" : "bg-neutral-400")}
                        title={`Missing: ${gaps.join(", ")}`}
                      />
                    )}
                  </div>
                  <span className={cn("mt-1 truncate text-[10px] font-medium leading-none", isActive ? "text-white/80" : "text-[var(--color-ink-faint)]")}>
                    {formatDuration(scene.durationSec)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
