import type { AspectRatio, Project } from "@/types";
import { totalSceneSeconds } from "./estimate";

export type Fit = "great" | "ok" | "weak";

export interface PlatformRec {
  name: string;
  fit: Fit;
  reason: string;
}

interface PlatformSpec {
  name: string;
  ratios: AspectRatio[]; // ideal aspect ratios
  maxSec: number; // hard upper limit for this surface
  sweetSpotSec: number; // best-performing length
}

// Approximate platform specs (early 2026). Vertical-first short-form vs. landscape long-form.
const SPECS: PlatformSpec[] = [
  { name: "YouTube Shorts", ratios: ["9:16"], maxSec: 180, sweetSpotSec: 45 },
  { name: "TikTok", ratios: ["9:16"], maxSec: 600, sweetSpotSec: 34 },
  { name: "Instagram Reels", ratios: ["9:16"], maxSec: 180, sweetSpotSec: 30 },
  { name: "YouTube (long-form)", ratios: ["16:9"], maxSec: 60 * 60, sweetSpotSec: 8 * 60 },
  { name: "Instagram Feed", ratios: ["1:1", "9:16"], maxSec: 90, sweetSpotSec: 30 },
  { name: "Facebook / X", ratios: ["16:9", "1:1"], maxSec: 600, sweetSpotSec: 60 },
];

function rate(spec: PlatformSpec, aspect: AspectRatio, seconds: number): PlatformRec | null {
  const ratioMatch = spec.ratios.includes(aspect);
  if (!ratioMatch) return null; // wrong shape — don't recommend at all
  if (seconds === 0) {
    return { name: spec.name, fit: "ok", reason: `Fits ${aspect}` };
  }
  if (seconds > spec.maxSec) {
    return { name: spec.name, fit: "weak", reason: `Too long (max ${fmtShort(spec.maxSec)})` };
  }
  // Within limits — grade by closeness to the sweet spot.
  const ratioToSweet = seconds / spec.sweetSpotSec;
  if (ratioToSweet <= 1.5) return { name: spec.name, fit: "great", reason: `Ideal length (~${fmtShort(spec.sweetSpotSec)} sweet spot)` };
  return { name: spec.name, fit: "ok", reason: `Works (under ${fmtShort(spec.maxSec)} limit)` };
}

function fmtShort(s: number): string {
  if (s >= 60) return `${Math.round(s / 60)}m`;
  return `${s}s`;
}

const fitRank: Record<Fit, number> = { great: 0, ok: 1, weak: 2 };

export function recommendPlatforms(project: Project): PlatformRec[] {
  const seconds = totalSceneSeconds(project.scenes);
  return SPECS.map((s) => rate(s, project.aspectRatio, seconds))
    .filter((r): r is PlatformRec => r !== null)
    .sort((a, b) => fitRank[a.fit] - fitRank[b.fit]);
}

// Sanity check: does the project's *intended* platform match its aspect ratio?
export function formatMismatch(project: Project): string | null {
  const vertical = ["TikTok", "Reels", "Shorts"];
  const isVerticalTarget = vertical.includes(project.platform);
  if (isVerticalTarget && project.aspectRatio !== "9:16") {
    return `${project.platform} is vertical-first — switch the project to 9:16 for best results.`;
  }
  if (project.platform === "YouTube" && project.aspectRatio === "9:16") {
    return "Standard YouTube favors 16:9 — keep 9:16 only if you're targeting Shorts.";
  }
  return null;
}
