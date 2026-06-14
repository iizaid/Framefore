import type { GlobalSettings, Project, Scene } from "@/types";
import { formatDuration, wordCount } from "./utils";
import { narrationSeconds, totalNarrationSeconds, totalSceneSeconds } from "./estimate";
import { resolvedImageModel, resolvedVideoModel } from "./models";

const pad = (n: number) => String(n).padStart(2, "0");

function globalBlock(g: GlobalSettings): string {
  const rows = ([
    ["Visual Style", g.visualStyle],
    ["Camera Style", g.cameraStyle],
    ["Mood", g.mood],
    ["Color Palette", g.colorPalette],
    ["Main Character", g.mainCharacter],
    ["Main Location", g.mainLocation],
    ["Negative Prompt", g.negativePrompt],
    ["Target AI Tool", g.targetToolNotes],
    ["Output Format", g.outputFormatNotes],
  ] as [string, string][]).filter(([, v]) => v.trim());
  if (!rows.length) return "";
  return rows.map(([k, v]) => `- **${k}:** ${v}`).join("\n");
}

function sceneMarkdown(scene: Scene, index: number, project: Project): string {
  const includeGlobalNeg = project.global.negativePrompt;
  const lines: string[] = [];
  lines.push(`## Scene ${pad(index + 1)} — ${scene.title || "Untitled"}`);
  lines.push("");
  lines.push(`- **Duration:** ${formatDuration(scene.durationSec)}`);
  lines.push(`- **Status:** ${scene.status}${scene.role && scene.role !== "none" ? ` · ${scene.role}` : ""}`);
  if (scene.subjectName?.trim()) lines.push(`- **Subject:** ${scene.subjectName}`);
  if (scene.summary.trim()) lines.push(`- **Summary:** ${scene.summary}`);
  lines.push("");
  if (scene.visualPrompt.trim()) {
    lines.push(`**Visual Prompt**`, "", "```", scene.visualPrompt.trim(), "```", "");
  }
  const neg = [scene.negativePrompt, includeGlobalNeg].filter((s) => s.trim()).join(", ");
  if (neg) lines.push(`**Negative Prompt**`, "", "```", neg, "```", "");

  const meta = ([
    ["Camera Angle", scene.cameraAngle],
    ["Camera Movement", scene.cameraMovement],
    ["Mood", scene.mood],
    ["Lighting", scene.lighting],
    ["Visual Style", scene.visualStyle],
    ["Character", scene.characterNotes],
    ["Location", scene.locationNotes],
    ["Motion", scene.motionNotes],
    ["Sound FX", scene.sfxNotes],
    ["Music", scene.musicNotes],
    ["Image model", resolvedImageModel(scene, project)],
    ["Video model", resolvedVideoModel(scene, project)],
  ] as [string, string][]).filter(([, v]) => v.trim());
  if (meta.length) {
    lines.push(...meta.map(([k, v]) => `- **${k}:** ${v}`), "");
  }
  if (scene.images.length) {
    lines.push(`- **Reference Images:** ${scene.images.map((i) => i.name).join(", ")}`);
  }
  if (scene.narrationPart.trim()) {
    lines.push("", `**Narration**`, "", `> ${scene.narrationPart.trim().replace(/\n/g, "\n> ")}`);
  }
  const flow = ([
    ["Transition to next", scene.transitionToNext],
    ["Continuity", scene.continuityNotes],
    ["Ending beat", scene.endingBeat],
  ] as [string, string][]).filter(([, v]) => v.trim());
  if (flow.length) {
    lines.push("", ...flow.map(([k, v]) => `- **${k}:** ${v}`));
  }
  if (scene.notes.trim()) lines.push("", `**Notes:** ${scene.notes}`);
  return lines.join("\n");
}

export function toMarkdown(project: Project): string {
  const out: string[] = [];
  out.push(`# ${project.title}`, "");
  if (project.description.trim()) out.push(project.description, "");
  out.push(
    `> Platform: ${project.platform} · Aspect: ${project.aspectRatio} · ` +
      `${project.scenes.length} scenes · ~${formatDuration(totalSceneSeconds(project.scenes))} video · ` +
      `~${formatDuration(totalNarrationSeconds(project))} narration`,
    "",
  );
  const g = globalBlock(project.global);
  if (g) out.push(`## Global Style`, "", g, "");
  if (project.narration.trim()) {
    out.push(`## Full Narration`, "", project.narration.trim(), "");
  }
  out.push("---", "");
  project.scenes.forEach((s, i) => {
    out.push(sceneMarkdown(s, i, project), "");
  });
  return out.join("\n");
}

export function toJSON(project: Project): string {
  return JSON.stringify(project, null, 2);
}

export function toPlainText(project: Project): string {
  const out: string[] = [`${project.title.toUpperCase()}\n`];
  project.scenes.forEach((s, i) => {
    out.push(`SCENE ${pad(i + 1)} — ${s.title} (${formatDuration(s.durationSec)})`);
    if (s.visualPrompt.trim()) out.push(s.visualPrompt.trim());
    if (s.narrationPart.trim()) out.push(`Narration: ${s.narrationPart.trim()}`);
    out.push("");
  });
  return out.join("\n");
}

// A compact "prompt pack" — just the generation-ready prompts, one block per scene,
// with global style folded in. This is the thing you paste into an AI video tool.
export function toPromptPack(project: Project): string {
  const g = project.global;
  const prefix = [g.visualStyle, g.cameraStyle, g.mood, g.colorPalette]
    .filter((s) => s.trim())
    .join(", ");
  const globalNeg = g.negativePrompt.trim();
  return project.scenes
    .map((s, i) => {
      const full = [prefix, s.visualPrompt.trim()].filter(Boolean).join(", ");
      const neg = [s.negativePrompt, globalNeg].filter((x) => x.trim()).join(", ");
      const parts = [`# Scene ${pad(i + 1)} — ${s.title || "Untitled"} [${formatDuration(s.durationSec)}]`];
      const imgModel = resolvedImageModel(s, project);
      const vidModel = resolvedVideoModel(s, project);
      const models = [imgModel && `img: ${imgModel}`, vidModel && `video: ${vidModel}`].filter(Boolean);
      if (models.length) parts.push(`MODELS: ${models.join(" · ")}`);
      if (full) parts.push(`PROMPT: ${full}`);
      if (neg) parts.push(`NEGATIVE: ${neg}`);
      return parts.join("\n");
    })
    .join("\n\n");
}

export function narrationOnly(project: Project): string {
  const parts = project.scenes.filter((s) => s.narrationPart.trim());
  if (parts.length) {
    return parts
      .map((s, i) => `[Scene ${pad(i + 1)} — ${s.title}]\n${s.narrationPart.trim()}`)
      .join("\n\n");
  }
  return project.narration.trim();
}

export function sceneListOnly(project: Project): string {
  return project.scenes
    .map(
      (s, i) =>
        `${pad(i + 1)}. ${s.title || "Untitled"} — ${formatDuration(s.durationSec)} — ${s.status}` +
        (s.tag ? ` (${s.tag})` : ""),
    )
    .join("\n");
}

// Single-scene prompt for the per-scene "copy prompt" button.
export function scenePrompt(scene: Scene, global: GlobalSettings): string {
  const prefix = [global.visualStyle, global.cameraStyle, global.mood]
    .filter((s) => s.trim())
    .join(", ");
  const full = [prefix, scene.visualPrompt.trim()].filter(Boolean).join(", ");
  const neg = [scene.negativePrompt, global.negativePrompt].filter((x) => x.trim()).join(", ");
  const parts = [full];
  if (neg) parts.push(`\nNegative: ${neg}`);
  return parts.join("");
}

// A shot-list style table for production planning.
export function toShotList(project: Project): string {
  const header = "| # | Title | Dur | Status | Camera | Words |\n|---|-------|-----|--------|--------|-------|";
  const rows = project.scenes.map(
    (s, i) =>
      `| ${pad(i + 1)} | ${s.title || "—"} | ${formatDuration(s.durationSec)} | ${s.status} | ${
        [s.cameraAngle, s.cameraMovement].filter(Boolean).join(" / ") || "—"
      } | ${wordCount(s.narrationPart)} |`,
  );
  return [header, ...rows].join("\n");
}

export const narrationSecondsForScene = (scene: Scene) => narrationSeconds(scene.narrationPart);
