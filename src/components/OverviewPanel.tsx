import { useState } from "react";
import {
  Download,
  ChevronDown,
  AlertTriangle,
  Send,
  FileText,
} from "lucide-react";
import type { Project } from "@/types";
import { cn, formatDuration } from "@/lib/utils";
import { totalNarrationSeconds, totalSceneSeconds } from "@/lib/estimate";
import { scoreProject, storyFlowHealth } from "@/lib/readiness";
import { recommendPlatforms, formatMismatch, type Fit } from "@/lib/publish";
import { Button } from "./ui/primitives";

export function OverviewPanel({
  project,
  onExport,
  onOpenScript,
}: {
  project: Project;
  onExport: () => void;
  onOpenScript: () => void;
}) {
  const r = scoreProject(project);
  const sceneSec = totalSceneSeconds(project.scenes);
  const narrSec = totalNarrationSeconds(project);
  const health = storyFlowHealth(project);
  const hasScenes = project.scenes.length > 0;

  // Missing essentials — only surfaced when they exist.
  const gaps = [
    { n: r.scenesWithoutPrompt.length, label: "missing visual prompt" },
    { n: project.scenes.filter((s) => !s.narrationPart.trim()).length, label: "missing narration" },
    { n: r.scenesWithoutImages.length, label: "missing reference image" },
  ].filter((g) => g.n > 0);

  const recs = recommendPlatforms(project);
  const best = recs[0];
  const mismatch = formatMismatch(project);

  return (
    <div className="space-y-6">
      {/* Readiness */}
      <div>
        <div className="mb-2 flex items-end justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-faint)]">Readiness</span>
          <span className="font-display text-3xl leading-none text-[var(--color-ink)]">{r.score}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-stone-surface)]">
          <div className="h-full rounded-full bg-[#121212] transition-all duration-500" style={{ width: `${r.score}%` }} />
        </div>
        {hasScenes && (
          <p className="mt-1.5 text-[11px] text-[var(--color-ink-faint)]">
            {r.readyOrFinal} of {project.scenes.length} scenes ready
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Stat value={String(project.scenes.length)} label="Scenes" />
        <Stat value={formatDuration(sceneSec)} label="Video" />
        <Stat value={formatDuration(narrSec)} label="Narration" />
      </div>

      <Button variant="primary" onClick={onExport} className="w-full">
        <Download size={16} /> Export video plan
      </Button>

      {/* Missing essentials — quiet, only when present */}
      {gaps.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-faint)]">Missing essentials</span>
          {gaps.map((g, i) => (
            <div key={i} className="flex items-center gap-2 text-[13px] text-[var(--color-ink-soft)]">
              <span className="grid h-4 w-4 place-items-center rounded-full bg-[var(--color-stone-surface)] text-[10px] font-semibold text-[var(--color-ink)]">
                {g.n}
              </span>
              {g.label}{g.n > 1 ? "s" : ""}
            </div>
          ))}
        </div>
      )}

      {/* Publishing — compact card */}
      <div className="rounded-[10px] card-surface p-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-faint)]">
            <Send size={12} /> Publishing
          </span>
          <span className="rounded-md bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-ink-soft)]">
            {project.platform} · {project.aspectRatio}
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          {best ? (
            <>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ember)]">Best</span>
              <span className="text-sm font-semibold text-[var(--color-ink)]">{best.name}</span>
              <span className="ml-auto text-[11px] text-[var(--color-ink-faint)]">{formatDuration(sceneSec)} total</span>
            </>
          ) : (
            <span className="text-[12px] text-[var(--color-ink-faint)]">
              No strong match for {project.aspectRatio}. Try a different aspect ratio.
            </span>
          )}
        </div>

        {(mismatch || recs.length > 1) && (
          <Collapsible title="Platform recommendations">
            {mismatch && (
              <p className="mb-2 flex items-start gap-1.5 text-[12px] leading-snug text-[var(--color-ink-soft)]">
                <AlertTriangle size={13} className="mt-0.5 shrink-0 text-[var(--color-sunburst)]" />
                {mismatch}
              </p>
            )}
            <div className="space-y-1.5">
              {recs.map((rec, i) => (
                <div key={rec.name} className="flex items-center gap-2">
                  <FitDot fit={rec.fit} best={i === 0} />
                  <span className={cn("text-[13px]", i === 0 ? "font-semibold text-[var(--color-ink)]" : "text-[var(--color-ink-soft)]")}>
                    {rec.name}
                  </span>
                  <span className="ml-auto text-[11px] text-[var(--color-ink-faint)]">{rec.reason}</span>
                </div>
              ))}
            </div>
          </Collapsible>
        )}
      </div>

      {/* Story Flow Health — only when there are real problems */}
      {health.length > 0 && (
        <Collapsible
          title="Story flow needs attention"
          tone="warn"
          badge={String(health.length)}
        >
          <div className="space-y-1.5">
            {health.slice(0, 6).map((w, i) => (
              <div key={i} className="flex items-center gap-2 text-[12px]">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#121212] text-[10px] font-semibold text-white">
                  {String(w.sceneIndex + 1).padStart(2, "0")}
                </span>
                <span className="text-[var(--color-ink-soft)]">{w.issue}</span>
              </div>
            ))}
            {health.length > 6 && (
              <p className="text-[11px] text-[var(--color-ink-faint)]">+{health.length - 6} more</p>
            )}
          </div>
        </Collapsible>
      )}

      {/* Script shortcut */}
      <button
        onClick={onOpenScript}
        className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2.5 text-[13px] font-medium text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-surface-2)] card-surface"
      >
        <FileText size={14} className="text-[var(--color-ink-faint)]" />
        Open full script
        <ChevronDown size={15} className="ml-auto -rotate-90 text-[var(--color-ink-faint)]" />
      </button>
    </div>
  );
}

function FitDot({ fit, best }: { fit: Fit; best: boolean }) {
  const color = best ? "var(--color-ember)" : fit === "great" ? "var(--color-meadow)" : fit === "ok" ? "var(--color-ink-faint)" : "var(--color-fog)";
  return <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />;
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[10px] bg-[var(--color-surface-2)] p-2.5 text-center">
      <div className="text-base font-semibold tabular-nums text-[var(--color-ink)]">{value}</div>
      <div className="text-[10px] text-[var(--color-ink-faint)]">{label}</div>
    </div>
  );
}

function Collapsible({
  title,
  badge,
  tone = "neutral",
  defaultOpen = false,
  children,
}: {
  title: string;
  badge?: string;
  tone?: "neutral" | "warn";
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const warn = tone === "warn";
  return (
    <div className={cn("mt-2", warn && "rounded-[10px] bg-amber-50/60 p-2 ring-1 ring-amber-200/70")}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-1.5 text-[12px] font-medium transition-colors",
          warn ? "text-amber-700" : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]",
        )}
      >
        {warn && <AlertTriangle size={13} className="shrink-0" />}
        {title}
        {badge && <span className="rounded-full bg-[var(--color-stone-surface)] px-1.5 text-[10px] font-semibold text-[var(--color-ink-soft)]">{badge}</span>}
        <ChevronDown size={14} className={cn("ml-auto transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className={cn("pt-2", !warn && "mt-0")}>{children}</div>}
    </div>
  );
}
