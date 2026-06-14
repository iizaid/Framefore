import type { Project, Scene } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTION READINESS SCORING
//
// This decides what "ready to generate" means for a scene. It's intentionally
// data-driven: each check is a named requirement with a weight. The score is the
// fraction of weighted checks a scene passes (0–100).
//
// ⚙️  This is YOUR creative call — tune the checks/weights to match how you
//     actually work. Care a lot about reference images? Bump that weight. Don't
//     use negative prompts? Drop that check.
// ─────────────────────────────────────────────────────────────────────────────

export interface ReadinessCheck {
  key: string;
  label: string;
  weight: number;
  passed: (s: Scene) => boolean;
}

const has = (v: string) => v.trim().length > 0;

export const SCENE_CHECKS: ReadinessCheck[] = [
  { key: "title", label: "Has a title", weight: 1, passed: (s) => has(s.title) },
  { key: "prompt", label: "Has a visual prompt", weight: 3, passed: (s) => has(s.visualPrompt) },
  { key: "duration", label: "Has a duration", weight: 1, passed: (s) => s.durationSec > 0 },
  { key: "camera", label: "Camera defined", weight: 1, passed: (s) => has(s.cameraAngle) || has(s.cameraMovement) },
  { key: "mood", label: "Mood / lighting set", weight: 1, passed: (s) => has(s.mood) || has(s.lighting) },
  { key: "images", label: "Has a reference image", weight: 2, passed: (s) => s.images.length > 0 },
  { key: "narration", label: "Narration assigned", weight: 1, passed: (s) => has(s.narrationPart) },
];

export interface SceneReadiness {
  score: number; // 0–100
  missing: string[]; // labels of failed checks
}

export function scoreScene(scene: Scene): SceneReadiness {
  const total = SCENE_CHECKS.reduce((sum, c) => sum + c.weight, 0);
  let earned = 0;
  const missing: string[] = [];
  for (const c of SCENE_CHECKS) {
    if (c.passed(scene)) earned += c.weight;
    else missing.push(c.label);
  }
  return { score: Math.round((earned / total) * 100), missing };
}

export interface ProjectReadiness {
  score: number;
  scenesWithoutPrompt: Scene[];
  scenesWithoutImages: Scene[];
  readyOrFinal: number;
  perScene: { scene: Scene; readiness: SceneReadiness }[];
}

export interface FlowWarning {
  sceneIndex: number;
  sceneId: string;
  issue: string;
}

// Non-AI story-flow checks: surfaces gaps that break the scene-to-scene chain.
export function storyFlowHealth(project: Project): FlowWarning[] {
  const warnings: FlowWarning[] = [];
  const scenes = project.scenes;
  scenes.forEach((s, i) => {
    const add = (issue: string) => warnings.push({ sceneIndex: i, sceneId: s.id, issue });
    if (!has(s.title)) add("No title");
    if (!has(s.visualPrompt)) add("No visual prompt");
    if (!has(s.narrationPart)) add("No narration");
    // Every scene except the last should hand off to the next one.
    if (i < scenes.length - 1 && !has(s.transitionToNext)) add("No transition to next scene");
    // A middle/later scene with no continuity link can feel isolated.
    if (i > 0 && !has(s.continuityNotes) && !has(s.transitionToNext)) add("Feels isolated from previous scene");
  });
  return warnings;
}

export function scoreProject(project: Project): ProjectReadiness {
  const perScene = project.scenes.map((scene) => ({
    scene,
    readiness: scoreScene(scene),
  }));
  const score = perScene.length
    ? Math.round(perScene.reduce((sum, p) => sum + p.readiness.score, 0) / perScene.length)
    : 0;
  return {
    score,
    scenesWithoutPrompt: project.scenes.filter((s) => !has(s.visualPrompt)),
    scenesWithoutImages: project.scenes.filter((s) => s.images.length === 0),
    readyOrFinal: project.scenes.filter((s) => s.status === "Ready" || s.status === "Final").length,
    perScene,
  };
}
