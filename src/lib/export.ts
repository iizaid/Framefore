import type {
  CanvasLink,
  CanvasNote,
  CanvasSection,
  GlobalSettings,
  Project,
  Scene,
  SceneLink,
} from "@/types";
import { formatDuration, wordCount } from "./utils";
import { narrationSeconds, totalNarrationSeconds, totalSceneSeconds } from "./estimate";
import { resolvedImageModel, resolvedVideoModel } from "./models";

const pad = (n: number) => String(n).padStart(2, "0");
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

// ─────────────────────────────────────────────────────────────────────────────
// CANVAS ↔ TIMELINE BRIDGE
//
// The canvas is annotation only. A note "belongs to" a scene when a CanvasLink
// joins them — never by geometry. Export always walks `project.scenes` in array
// order, so canvas positions can NEVER change the exported video order.
// ─────────────────────────────────────────────────────────────────────────────

const has = (v: string | undefined) => Boolean(v && v.trim());

// Short human label for a canvas note (kind + trimmed text).
function noteLabel(note: CanvasNote): string {
  const kind = note.kind ? `${cap(note.kind)}: ` : "";
  return `${kind}${note.text.trim()}`;
}

// Notes connected (via a canvas link, either direction) to a given scene.
function notesForScene(project: Project, sceneId: string): CanvasNote[] {
  const notes = project.canvasNotes ?? [];
  const links = project.canvasLinks ?? [];
  const linkedNoteIds = new Set<string>();
  for (const l of links) {
    if (l.fromNodeType === "scene" && l.fromNodeId === sceneId && l.toNodeType === "note") linkedNoteIds.add(l.toNodeId);
    if (l.toNodeType === "scene" && l.toNodeId === sceneId && l.fromNodeType === "note") linkedNoteIds.add(l.fromNodeId);
  }
  return notes.filter((n) => linkedNoteIds.has(n.id) && has(n.text));
}

// Notes not connected to ANY scene — surfaced separately so nothing is lost.
function unassignedNotes(project: Project): CanvasNote[] {
  const links = project.canvasLinks ?? [];
  const connectedToScene = new Set<string>();
  for (const l of links) {
    if (l.fromNodeType === "note" && l.toNodeType === "scene") connectedToScene.add(l.fromNodeId);
    if (l.toNodeType === "note" && l.fromNodeType === "scene") connectedToScene.add(l.toNodeId);
  }
  return (project.canvasNotes ?? []).filter((n) => has(n.text) && !connectedToScene.has(n.id));
}

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

  // Connected canvas notes attach under their scene.
  const canvasNotes = notesForScene(project, scene.id);
  if (canvasNotes.length) {
    lines.push("", `**Canvas Notes**`, "", ...canvasNotes.map((n) => `- ${noteLabel(n)}`));
  }
  return lines.join("\n");
}

// Display label for any canvas node (scene / note / section) used in the
// relationships section.
function nodeRefLabel(project: Project, id: string, type: "scene" | "note" | "section"): string {
  if (type === "scene") {
    const i = project.scenes.findIndex((s) => s.id === id);
    if (i < 0) return "Scene (removed)";
    return `Scene ${pad(i + 1)} — ${project.scenes[i].title || "Untitled"}`;
  }
  if (type === "note") {
    const note = (project.canvasNotes ?? []).find((n) => n.id === id);
    const text = note?.text.trim() || "(empty note)";
    return `Note "${text.length > 40 ? text.slice(0, 40) + "…" : text}"`;
  }
  const section = (project.canvasSections ?? []).find((s) => s.id === id);
  return `Section "${section?.title || "Untitled"}"`;
}

function relationshipLine(label: string, type?: string): string {
  const tag = [type && cap(type), label].filter(Boolean).join(" · ");
  return tag ? ` — ${tag}` : "";
}

// "## Canvas Relationships" — visual planning links, NOT timeline order.
function canvasRelationshipsMarkdown(project: Project): string {
  const sceneIds = new Set(project.scenes.map((s) => s.id));
  const sceneLinks = (project.links ?? []).filter(
    (l) => sceneIds.has(l.fromSceneId) && sceneIds.has(l.toSceneId),
  );
  const canvasLinks = (project.canvasLinks ?? []).filter(
    (l) => l.fromNodeType !== "section" && l.toNodeType !== "section",
  );
  if (!sceneLinks.length && !canvasLinks.length) return "";

  const lines: string[] = [`## Canvas Relationships`, ""];
  lines.push(`*Visual planning links only — these do not affect the video order.*`, "");

  sceneLinks.forEach((l: SceneLink) => {
    const from = nodeRefLabel(project, l.fromSceneId, "scene");
    const to = nodeRefLabel(project, l.toSceneId, "scene");
    lines.push(`- ${from} → ${to}${relationshipLine(l.label ?? "", l.type)}`);
  });
  canvasLinks.forEach((l: CanvasLink) => {
    const from = nodeRefLabel(project, l.fromNodeId, l.fromNodeType as "scene" | "note");
    const to = nodeRefLabel(project, l.toNodeId, l.toNodeType as "scene" | "note");
    lines.push(`- ${from} → ${to}${relationshipLine(l.label ?? "", l.type)}`);
  });
  return lines.join("\n");
}

// "## Story Sections" — section frames from the canvas, with any scenes that sit
// geometrically inside the frame (simple containment; falls back to title only).
function storySectionsMarkdown(project: Project): string {
  const sections = project.canvasSections ?? [];
  if (!sections.length) return "";
  const lines: string[] = [`## Story Sections`, ""];
  for (const section of sections) {
    const heading = `### ${section.title || "Untitled"}${
      section.type && section.type !== "custom" ? ` (${cap(section.type)})` : ""
    }`;
    lines.push(heading);
    const inside = scenesInsideSection(project, section);
    if (inside.length) {
      lines.push("", ...inside.map((i) => `- Scene ${pad(i + 1)} — ${project.scenes[i].title || "Untitled"}`));
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

// Scene indexes whose stored canvas position falls within the section rectangle.
// Purely best-effort: a scene with no layout is skipped (never guessed).
function scenesInsideSection(project: Project, section: CanvasSection): number[] {
  const out: number[] = [];
  project.scenes.forEach((s, i) => {
    if (!s.layout) return;
    const { x, y } = s.layout;
    if (x >= section.x && x <= section.x + section.width && y >= section.y && y <= section.y + section.height) {
      out.push(i);
    }
  });
  return out;
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

  const sections = storySectionsMarkdown(project);
  if (sections) out.push("---", "", sections, "");

  const relationships = canvasRelationshipsMarkdown(project);
  if (relationships) out.push("---", "", relationships, "");

  const orphans = unassignedNotes(project);
  if (orphans.length) {
    out.push("---", "", `## Unassigned Canvas Notes`, "", ...orphans.map((n) => `- ${noteLabel(n)}`), "");
  }
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

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT PACK — the primary handoff. One self-contained block per scene with
// everything an AI video tool needs to generate it. Empty fields are skipped so
// the output stays readable, not noisy.
// ─────────────────────────────────────────────────────────────────────────────
function promptPackScene(scene: Scene, index: number, project: Project): string {
  const g = project.global;
  const lines: string[] = [
    `# Scene ${pad(index + 1)} — ${scene.title || "Untitled"} [${formatDuration(scene.durationSec)}]`,
  ];

  lines.push(`PLATFORM: ${project.platform} · ${project.aspectRatio}`);

  const imgModel = resolvedImageModel(scene, project);
  const vidModel = resolvedVideoModel(scene, project);
  const models = [imgModel && `image: ${imgModel}`, vidModel && `video: ${vidModel}`].filter(Boolean);
  if (models.length) lines.push(`MODELS: ${models.join(" · ")}`);

  // STYLE = global creative direction + any scene-level style descriptors.
  const style = [
    g.visualStyle,
    g.cameraStyle,
    g.mood,
    g.colorPalette,
    scene.visualStyle,
    [scene.cameraAngle, scene.cameraMovement].filter((s) => s.trim()).join(" "),
    scene.mood,
    scene.lighting,
  ]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(", ");
  if (style) lines.push(`STYLE: ${style}`);

  if (scene.visualPrompt.trim()) lines.push(`PROMPT:`, scene.visualPrompt.trim());

  const neg = [scene.negativePrompt, g.negativePrompt].filter((s) => s.trim()).join(", ");
  if (neg) lines.push(`NEGATIVE:`, neg);

  if (scene.images.length) lines.push(`REFERENCES:`, scene.images.map((i) => i.name).join(", "));

  if (scene.narrationPart.trim()) lines.push(`VOICEOVER:`, scene.narrationPart.trim());

  if (scene.continuityNotes.trim()) lines.push(`CONTINUITY:`, scene.continuityNotes.trim());
  if (scene.endingBeat.trim()) lines.push(`ENDING BEAT:`, scene.endingBeat.trim());
  if (scene.transitionToNext.trim()) lines.push(`TRANSITION:`, scene.transitionToNext.trim());

  const canvasNotes = notesForScene(project, scene.id);
  if (canvasNotes.length) {
    lines.push(`CANVAS NOTES:`, ...canvasNotes.map((n) => `* ${noteLabel(n)}`));
  }

  return lines.join("\n");
}

export function toPromptPack(project: Project): string {
  return project.scenes.map((s, i) => promptPackScene(s, i, project)).join("\n\n");
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
        (s.role && s.role !== "none" ? ` (${s.role})` : ""),
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

// A production shot-list table. One row per scene, timeline order.
export function toShotList(project: Project): string {
  const header =
    "| # | Title | Dur | Role | Status | Video model | Prompt | Words | Refs | Transition | Notes |\n" +
    "|---|-------|-----|------|--------|-------------|--------|-------|------|------------|-------|";
  const rows = project.scenes.map((s, i) => {
    const role = s.role && s.role !== "none" ? s.role : "—";
    const vid = resolvedVideoModel(s, project) || "—";
    const prompt = s.visualPrompt.trim() ? "✓" : "—";
    const transition = s.transitionToNext.trim() ? "✓" : i === project.scenes.length - 1 ? "—" : "✗";
    const notes = notesForScene(project, s.id).length;
    return (
      `| ${pad(i + 1)} | ${s.title || "—"} | ${formatDuration(s.durationSec)} | ${role} | ${s.status} | ` +
      `${vid} | ${prompt} | ${wordCount(s.narrationPart)} | ${s.images.length} | ${transition} | ${notes} |`
    );
  });
  return [header, ...rows].join("\n");
}

export const narrationSecondsForScene = (scene: Scene) => narrationSeconds(scene.narrationPart);
