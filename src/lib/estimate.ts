import type { Project, Scene } from "@/types";
import { wordCount } from "./utils";

// Average narration speed. Documentary/explainer narration tends to land around
// 140–160 wpm; punchy social content runs faster. 150 is a sane middle default.
// Arabic narration is counted by words too — close enough for planning purposes.
export const WORDS_PER_MINUTE = 150;

export function narrationSeconds(text: string, wpm = WORDS_PER_MINUTE): number {
  const words = wordCount(text);
  if (!words) return 0;
  return Math.round((words / wpm) * 60);
}

export function totalSceneSeconds(scenes: Scene[]): number {
  return scenes.reduce((sum, s) => sum + (s.durationSec || 0), 0);
}

export function totalNarrationSeconds(project: Project, wpm = WORDS_PER_MINUTE): number {
  // Prefer the sum of assigned narration parts; fall back to the full script
  // if no parts have been assigned yet.
  const assigned = project.scenes
    .map((s) => s.narrationPart)
    .filter((p) => p && p.trim().length > 0);
  if (assigned.length > 0) {
    return assigned.reduce((sum, p) => sum + narrationSeconds(p, wpm), 0);
  }
  return narrationSeconds(project.narration, wpm);
}

export interface SceneTiming {
  scene: Scene;
  narrationSec: number;
  diffSec: number; // narration - visual duration; positive = narration overflows
  verdict: "balanced" | "too much narration" | "too little narration" | "no narration";
}

const BALANCE_TOLERANCE = 2; // seconds of slack before we flag a mismatch

export function sceneTimings(scenes: Scene[], wpm = WORDS_PER_MINUTE): SceneTiming[] {
  return scenes.map((scene) => {
    const narrationSec = narrationSeconds(scene.narrationPart, wpm);
    const diffSec = narrationSec - scene.durationSec;
    let verdict: SceneTiming["verdict"];
    if (narrationSec === 0) verdict = "no narration";
    else if (diffSec > BALANCE_TOLERANCE) verdict = "too much narration";
    else if (diffSec < -BALANCE_TOLERANCE) verdict = "too little narration";
    else verdict = "balanced";
    return { scene, narrationSec, diffSec, verdict };
  });
}
