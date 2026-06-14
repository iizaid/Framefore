import type { GlobalSettings, Project } from "@/types";
import { useStore } from "@/store/useStore";
import { Field, Input, Textarea } from "./ui/primitives";

// Global, project-wide creative direction. These optionally fold into every
// scene's exported prompt (see lib/export.ts → toPromptPack).
export function SettingsPanel({ project }: { project: Project }) {
  const updateProject = useStore((s) => s.updateProject);

  const setGlobal = <K extends keyof GlobalSettings>(k: K, v: GlobalSettings[K]) =>
    updateProject(project.id, { global: { ...project.global, [k]: v } });

  const g = project.global;

  return (
    <div className="space-y-4">
      <p className="text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
        Prepended to the STYLE line of every scene in the Prompt Pack — set it once instead of repeating it per scene.
      </p>

      <Field label="Global visual style">
        <Input value={g.visualStyle} onChange={(e) => setGlobal("visualStyle", e.target.value)} placeholder="Cinematic realism, 35mm film grain" />
      </Field>
      <Field label="Global camera style">
        <Input value={g.cameraStyle} onChange={(e) => setGlobal("cameraStyle", e.target.value)} placeholder="Anamorphic, shallow depth of field" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Global mood">
          <Input value={g.mood} onChange={(e) => setGlobal("mood", e.target.value)} placeholder="Dark, tense" />
        </Field>
        <Field label="Color palette">
          <Input value={g.colorPalette} onChange={(e) => setGlobal("colorPalette", e.target.value)} placeholder="Teal & orange" />
        </Field>
      </div>
      <Field label="Main character description">
        <Textarea value={g.mainCharacter} onChange={(e) => setGlobal("mainCharacter", e.target.value)} placeholder="Recurring subject — keep consistent across shots…" className="min-h-[60px]" />
      </Field>
      <Field label="Main location description">
        <Textarea value={g.mainLocation} onChange={(e) => setGlobal("mainLocation", e.target.value)} placeholder="The primary setting…" className="min-h-[60px]" />
      </Field>
      <Field label="General negative prompt">
        <Textarea value={g.negativePrompt} onChange={(e) => setGlobal("negativePrompt", e.target.value)} placeholder="Applies to all scenes: blurry, watermark, distorted…" className="min-h-[60px]" />
      </Field>
      <Field label="Target AI tool notes">
        <Input value={g.targetToolNotes} onChange={(e) => setGlobal("targetToolNotes", e.target.value)} placeholder="e.g. Runway Gen-3, Kling, Sora…" />
      </Field>
      <Field label="Output format notes">
        <Input value={g.outputFormatNotes} onChange={(e) => setGlobal("outputFormatNotes", e.target.value)} placeholder="e.g. 4K, 24fps, seed locked" />
      </Field>
    </div>
  );
}
