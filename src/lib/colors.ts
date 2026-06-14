import type { ColorLabel, Scene } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// SCENE COLOR SYSTEM
//
// One source of truth for the organization-color layer. The card, the horizontal
// timeline strip, the story-flow node, and the editor swatch all read from here
// so a "blue" scene looks blue everywhere.
//
// IMPORTANT: every class is a *static literal string*. Tailwind only ships the
// classes it can see in source — never build them dynamically (`bg-${c}-50`),
// or they'll be purged from the production bundle.
// ─────────────────────────────────────────────────────────────────────────────

export interface SceneColorStyle {
  /** Full-card tint: background + resting border + hover border + hover glow. */
  card: string;
  /** Ring color applied when the scene is the selected/active one. */
  ring: string;
  /** Stronger accent band drawn along the top (mobile) / left (desktop) edge. */
  band: string;
  /** Timeline-strip segment fill + hover. */
  segment: string;
  /** Solid swatch for dots / small indicators. */
  dot: string;
  /** Raw hex — for inline SVG strokes and the editor picker. */
  hex: string;
  /** Human label for tooltips. */
  label: string;
}

export const SCENE_COLORS: Record<ColorLabel, SceneColorStyle> = {
  none: {
    card: "bg-white border-[var(--color-border-strong)] hover:border-neutral-300 hover:shadow-[0_6px_22px_-8px_rgba(0,0,0,0.12)]",
    ring: "ring-neutral-900/20",
    band: "bg-neutral-200",
    segment: "bg-neutral-200/80 hover:bg-neutral-300 text-neutral-600",
    dot: "bg-neutral-400",
    hex: "#a3a3a3",
    label: "None",
  },
  violet: {
    card: "bg-violet-50 border-violet-200/80 hover:border-violet-300 hover:shadow-[0_6px_22px_-8px_rgba(139,92,246,0.30)]",
    ring: "ring-violet-400/50",
    band: "bg-violet-400",
    segment: "bg-violet-200 hover:bg-violet-300 text-violet-800",
    dot: "bg-violet-500",
    hex: "#8b5cf6",
    label: "Violet",
  },
  blue: {
    card: "bg-blue-50 border-blue-200/80 hover:border-blue-300 hover:shadow-[0_6px_22px_-8px_rgba(59,130,246,0.30)]",
    ring: "ring-blue-400/50",
    band: "bg-blue-400",
    segment: "bg-blue-200 hover:bg-blue-300 text-blue-800",
    dot: "bg-blue-500",
    hex: "#3b82f6",
    label: "Blue",
  },
  emerald: {
    card: "bg-emerald-50 border-emerald-200/80 hover:border-emerald-300 hover:shadow-[0_6px_22px_-8px_rgba(16,185,129,0.30)]",
    ring: "ring-emerald-400/50",
    band: "bg-emerald-400",
    segment: "bg-emerald-200 hover:bg-emerald-300 text-emerald-800",
    dot: "bg-emerald-500",
    hex: "#10b981",
    label: "Emerald",
  },
  amber: {
    card: "bg-amber-50 border-amber-200/80 hover:border-amber-300 hover:shadow-[0_6px_22px_-8px_rgba(245,158,11,0.30)]",
    ring: "ring-amber-400/50",
    band: "bg-amber-400",
    segment: "bg-amber-200 hover:bg-amber-300 text-amber-800",
    dot: "bg-amber-500",
    hex: "#f59e0b",
    label: "Amber",
  },
  rose: {
    card: "bg-rose-50 border-rose-200/80 hover:border-rose-300 hover:shadow-[0_6px_22px_-8px_rgba(244,63,94,0.30)]",
    ring: "ring-rose-400/50",
    band: "bg-rose-400",
    segment: "bg-rose-200 hover:bg-rose-300 text-rose-800",
    dot: "bg-rose-500",
    hex: "#f43f5e",
    label: "Rose",
  },
  slate: {
    card: "bg-slate-50 border-slate-200/80 hover:border-slate-300 hover:shadow-[0_6px_22px_-8px_rgba(100,116,139,0.30)]",
    ring: "ring-slate-400/50",
    band: "bg-slate-500",
    segment: "bg-slate-200 hover:bg-slate-300 text-slate-700",
    dot: "bg-slate-500",
    hex: "#64748b",
    label: "Slate",
  },
};

export function sceneColor(color: ColorLabel): SceneColorStyle {
  return SCENE_COLORS[color] ?? SCENE_COLORS.none;
}

// What we consider "essential" for a scene to be production-ready. Shared by the
// card badge and the timeline warning dot so they never disagree.
export function essentialGaps(scene: Scene): string[] {
  const gaps: string[] = [];
  if (!scene.visualPrompt.trim()) gaps.push("prompt");
  if (!scene.narrationPart.trim()) gaps.push("narration");
  if (scene.images.length === 0) gaps.push("reference");
  return gaps;
}
