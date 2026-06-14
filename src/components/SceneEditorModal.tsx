import { useRef, useState } from "react";
import {
  Copy,
  CopyPlus,
  Trash2,
  ImagePlus,
  X,
  Link2,
  Type,
  Wand2,
  Image as ImageIcon,
  Mic,
  GitBranch,
  SlidersHorizontal,
  Star,
} from "lucide-react";
import type { Direction, Project, Scene, SceneRole, SceneStatus } from "@/types";
import {
  COLOR_LABELS,
  DURATION_PRESETS,
  IMAGE_MODELS,
  SCENE_ROLES,
  SCENE_STATUSES,
  SUGGESTIONS,
  VIDEO_MODELS,
} from "@/lib/constants";
import { cn, copyToClipboard, formatDuration, wordCount } from "@/lib/utils";
import { narrationSeconds } from "@/lib/estimate";
import { scenePrompt } from "@/lib/export";
import { resolvedImageModel, resolvedVideoModel } from "@/lib/models";
import { saveImage, deleteImage } from "@/lib/images";
import { useStore } from "@/store/useStore";
import { Modal, ConfirmDialog } from "./ui/Modal";
import { AutoTextarea, Button, Field, Input, Select } from "./ui/primitives";
import { DirectionToggle, ImageThumb } from "./ui/widgets";
import { toast } from "./ui/toast";

type TabKey = "basics" | "prompt" | "media" | "voice" | "continuity" | "advanced";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "basics", label: "Basics", icon: <Type size={15} /> },
  { key: "prompt", label: "Prompt", icon: <Wand2 size={15} /> },
  { key: "media", label: "Media", icon: <ImageIcon size={15} /> },
  { key: "voice", label: "Voice", icon: <Mic size={15} /> },
  { key: "continuity", label: "Continuity", icon: <GitBranch size={15} /> },
  { key: "advanced", label: "Advanced", icon: <SlidersHorizontal size={15} /> },
];

export function SceneEditorModal({
  open,
  onClose,
  project,
  sceneId,
}: {
  open: boolean;
  onClose: () => void;
  project: Project;
  sceneId: string | null;
}) {
  const updateScene = useStore((s) => s.updateScene);
  const deleteScene = useStore((s) => s.deleteScene);
  const duplicateScene = useStore((s) => s.duplicateScene);

  const [tab, setTab] = useState<TabKey>("basics");
  const [confirmDel, setConfirmDel] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const index = project.scenes.findIndex((s) => s.id === sceneId);
  const scene = index >= 0 ? project.scenes[index] : undefined;
  const prevScene = index > 0 ? project.scenes[index - 1] : undefined;

  if (!scene) return null;

  const set = <K extends keyof Scene>(k: K, v: Scene[K]) => updateScene(project.id, scene.id, { [k]: v });

  const narrSec = narrationSeconds(scene.narrationPart);
  const narrationOverflow = narrSec > scene.durationSec + 2;

  const handleCopyPrompt = async () => {
    const ok = await copyToClipboard(scenePrompt(scene, project.global));
    toast(ok ? "Scene prompt copied" : "Copy failed", ok ? "success" : "error");
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files) return;
    const imgs = await Promise.all(
      Array.from(files)
        .filter((f) => f.type.startsWith("image/"))
        .map((f) => saveImage(f)),
    );
    if (imgs.length) {
      set("images", [...scene.images, ...imgs]);
      toast(`${imgs.length} image${imgs.length > 1 ? "s" : ""} added`);
    }
  };

  const removeImage = async (id: string) => {
    await deleteImage(id);
    set("images", scene.images.filter((i) => i.id !== id));
  };

  const resolvedImg = resolvedImageModel(scene, project);
  const resolvedVid = resolvedVideoModel(scene, project);

  return (
    <Modal open={open} onClose={onClose} className="max-w-2xl p-0">
      <div className="flex max-h-[85vh] min-h-0 flex-col">
        {/* Header */}
        <div className="shrink-0 border-b border-[var(--color-border)] px-6 pb-0 pt-6">
          <div className="flex items-start gap-3 pr-8">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#121212] text-sm font-semibold tabular-nums text-white">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1">
              <input
                value={scene.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder={`Scene ${index + 1} title…`}
                className="font-display w-full bg-transparent text-2xl leading-tight text-[var(--color-ink)] placeholder:font-sans placeholder:text-lg placeholder:font-normal placeholder:text-[var(--color-ink-faint)] focus:outline-none"
              />
              <p className="mt-0.5 text-xs text-[var(--color-ink-faint)]">
                {formatDuration(scene.durationSec)}
                {scene.role !== "none" ? ` · ${scene.role}` : ""} · {scene.status}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="no-scrollbar -mb-px mt-4 flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors",
                  tab === t.key
                    ? "border-[#121212] text-[var(--color-ink)]"
                    : "border-transparent text-[var(--color-ink-faint)] hover:text-[var(--color-ink-soft)]",
                )}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {tab === "basics" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Field label="Role">
                  <Select value={scene.role} onChange={(e) => set("role", e.target.value as SceneRole)}>
                    {SCENE_ROLES.map((r) => (
                      <option key={r} value={r}>{r === "none" ? "—" : r}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Duration">
                  <DurationPicker value={scene.durationSec} onChange={(v) => set("durationSec", v)} />
                </Field>
                <Field label="Status">
                  <Select value={scene.status} onChange={(e) => set("status", e.target.value as SceneStatus)}>
                    {SCENE_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Main subject / character">
                <Input value={scene.subjectName} onChange={(e) => set("subjectName", e.target.value)} placeholder="Who or what is this shot about?" />
              </Field>
              <Field label="Short summary">
                <Input value={scene.summary} onChange={(e) => set("summary", e.target.value)} placeholder="One line: what happens here?" />
              </Field>
            </div>
          )}

          {tab === "prompt" && (
            <div className="space-y-4">
              <Field label="Visual prompt" hint={<DirectionToggle dir={scene.promptDir} onChange={(d: Direction) => set("promptDir", d)} />}>
                <AutoTextarea
                  dir={scene.promptDir}
                  value={scene.visualPrompt}
                  onChange={(e) => set("visualPrompt", e.target.value)}
                  placeholder="Describe the shot for the AI video tool — subject, action, setting, style…"
                  minRows={4}
                />
              </Field>
              <Field label="Negative prompt" hint={<span className="text-[var(--color-ink-faint)]">what to avoid</span>}>
                <AutoTextarea
                  dir={scene.promptDir}
                  value={scene.negativePrompt}
                  onChange={(e) => set("negativePrompt", e.target.value)}
                  placeholder="blurry, watermark, distorted hands…"
                  minRows={2}
                />
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ModelField
                  label="Image model"
                  value={scene.imageModel}
                  onChange={(v) => set("imageModel", v)}
                  options={IMAGE_MODELS}
                  id={`imgmodel-${scene.id}`}
                  fallback={project.defaultImageModel}
                  resolved={resolvedImg}
                />
                <ModelField
                  label="Video model"
                  value={scene.videoModel}
                  onChange={(v) => set("videoModel", v)}
                  options={VIDEO_MODELS}
                  id={`vidmodel-${scene.id}`}
                  fallback={project.defaultVideoModel}
                  resolved={resolvedVid}
                />
              </div>
              <p className="text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
                Leave a model blank to use the project default. Set it here only to override this one scene.
              </p>
            </div>
          )}

          {tab === "media" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--color-ink-soft)]">
                  Reference images
                  {scene.images.length > 0 && <span className="ml-1.5 text-[var(--color-ink-faint)]">· first is the cover</span>}
                </span>
                <Button variant="subtle" size="sm" onClick={() => fileRef.current?.click()}>
                  <ImagePlus size={14} /> Add reference
                </Button>
                <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { handleUpload(e.target.files); e.target.value = ""; }} />
              </div>

              {scene.images.length > 0 ? (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {scene.images.map((img, i) => (
                    <div key={img.id} className="group/img relative aspect-square">
                      <ImageThumb id={img.id} alt={img.name} className="h-full w-full" />
                      {i === 0 && (
                        <span className="absolute left-1.5 top-1.5 flex items-center gap-0.5 rounded-md bg-black/65 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                          <Star size={9} className="fill-white" /> Cover
                        </span>
                      )}
                      <button
                        onClick={() => removeImage(img.id)}
                        className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-neutral-900 text-white opacity-0 transition-opacity group-hover/img:opacity-100"
                        aria-label="Remove image"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <DropZone fileRef={fileRef} onDrop={handleUpload} />
              )}
            </div>
          )}

          {tab === "voice" && (
            <div className="space-y-4">
              <Field
                label="Narration / voiceover"
                hint={
                  <span className="flex items-center gap-2">
                    <span className={cn(narrationOverflow && "text-amber-600")}>
                      {wordCount(scene.narrationPart)}w · ~{formatDuration(narrSec)}
                    </span>
                    <DirectionToggle dir={scene.narrationDir} onChange={(d: Direction) => set("narrationDir", d)} />
                  </span>
                }
              >
                <AutoTextarea
                  dir={scene.narrationDir}
                  value={scene.narrationPart}
                  onChange={(e) => set("narrationPart", e.target.value)}
                  placeholder="The spoken words during this scene…"
                  minRows={4}
                />
              </Field>
              <div className="flex items-center justify-between rounded-lg bg-[var(--color-surface-2)] px-3 py-2.5 text-xs">
                <span className="text-[var(--color-ink-soft)]">Estimated speaking time</span>
                <span className={cn("font-semibold tabular-nums", narrationOverflow ? "text-amber-600" : "text-[var(--color-ink)]")}>
                  ~{formatDuration(narrSec)} / {formatDuration(scene.durationSec)} scene
                </span>
              </div>
              {narrationOverflow && (
                <p className="flex items-start gap-1.5 text-[12px] leading-snug text-amber-600">
                  ⚠ Narration (~{formatDuration(narrSec)}) is longer than the scene ({formatDuration(scene.durationSec)}). Trim the script or extend the duration.
                </p>
              )}
            </div>
          )}

          {tab === "continuity" && (
            <div className="space-y-4">
              {prevScene && (
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-xs">
                  <div className="mb-2 flex items-center gap-1.5 font-medium text-[var(--color-ink-soft)]">
                    <Link2 size={13} /> Continues from Scene {String(index).padStart(2, "0")} — {prevScene.title || "Untitled"}
                  </div>
                  <PrevRow label="Ending beat" value={prevScene.endingBeat} />
                  <PrevRow label="Transition" value={prevScene.transitionToNext} />
                  <PrevRow label="Continuity" value={prevScene.continuityNotes} />
                  {!prevScene.endingBeat?.trim() && !prevScene.transitionToNext?.trim() && !prevScene.continuityNotes?.trim() && (
                    <p className="text-[var(--color-ink-faint)]">Nothing noted on the previous scene yet.</p>
                  )}
                </div>
              )}
              <Field label="Transition to next scene">
                <AutoTextarea value={scene.transitionToNext} onChange={(e) => set("transitionToNext", e.target.value)} placeholder="How does this cut into the next scene?" minRows={2} />
              </Field>
              <Field label="Continuity notes">
                <AutoTextarea value={scene.continuityNotes} onChange={(e) => set("continuityNotes", e.target.value)} placeholder="Characters, props, colors to keep consistent…" minRows={2} />
              </Field>
              <Field label="Ending beat">
                <AutoTextarea value={scene.endingBeat} onChange={(e) => set("endingBeat", e.target.value)} placeholder="How this scene ends — feeds the next scene's context." minRows={2} />
              </Field>
            </div>
          )}

          {tab === "advanced" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <SuggestField label="Camera angle" value={scene.cameraAngle} onChange={(v) => set("cameraAngle", v)} options={SUGGESTIONS.cameraAngle} id={`cam-${scene.id}`} />
                <SuggestField label="Camera movement" value={scene.cameraMovement} onChange={(v) => set("cameraMovement", v)} options={SUGGESTIONS.cameraMovement} id={`mov-${scene.id}`} />
                <SuggestField label="Lighting" value={scene.lighting} onChange={(v) => set("lighting", v)} options={SUGGESTIONS.lighting} id={`light-${scene.id}`} />
                <SuggestField label="Mood" value={scene.mood} onChange={(v) => set("mood", v)} options={SUGGESTIONS.mood} id={`mood-${scene.id}`} />
                <SuggestField label="Visual style" value={scene.visualStyle} onChange={(v) => set("visualStyle", v)} options={SUGGESTIONS.visualStyle} id={`style-${scene.id}`} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Character notes"><Input value={scene.characterNotes} onChange={(e) => set("characterNotes", e.target.value)} /></Field>
                <Field label="Location notes"><Input value={scene.locationNotes} onChange={(e) => set("locationNotes", e.target.value)} /></Field>
                <Field label="Motion notes"><Input value={scene.motionNotes} onChange={(e) => set("motionNotes", e.target.value)} /></Field>
                <Field label="Sound FX notes"><Input value={scene.sfxNotes} onChange={(e) => set("sfxNotes", e.target.value)} /></Field>
                <Field label="Music notes"><Input value={scene.musicNotes} onChange={(e) => set("musicNotes", e.target.value)} /></Field>
              </div>
              <Field label="Extra notes">
                <AutoTextarea value={scene.notes} onChange={(e) => set("notes", e.target.value)} minRows={2} />
              </Field>
              <Field label="Color label" hint={<span className="text-[var(--color-ink-faint)]">optional · for your own grouping</span>}>
                <ColorPicker value={scene.color} onChange={(c) => set("color", c)} />
              </Field>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center gap-2 border-t border-[var(--color-border)] px-6 py-3">
          <Button variant="primary" size="sm" onClick={handleCopyPrompt}>
            <Copy size={14} /> Copy prompt
          </Button>
          <Button variant="subtle" size="sm" onClick={() => duplicateScene(project.id, scene.id)}>
            <CopyPlus size={14} /> Duplicate
          </Button>
          <Button variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => setConfirmDel(true)}>
            <Trash2 size={14} /> Delete
          </Button>
          <Button variant="outline" size="sm" className="ml-auto" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDel}
        onClose={() => setConfirmDel(false)}
        onConfirm={() => { deleteScene(project.id, scene.id); onClose(); }}
        title="Delete scene?"
        message={`Scene ${index + 1}${scene.title ? ` — ${scene.title}` : ""} will be removed.`}
      />
    </Modal>
  );
}

function PrevRow({ label, value }: { label: string; value: string }) {
  if (!value?.trim()) return null;
  return (
    <p className="mb-1 last:mb-0 text-[var(--color-ink-faint)]">
      <span className="font-medium text-[var(--color-ink-soft)]">{label}:</span> {value}
    </p>
  );
}

function DropZone({ fileRef, onDrop }: { fileRef: React.RefObject<HTMLInputElement>; onDrop: (f: FileList | null) => void }) {
  const [over, setOver] = useState(false);
  return (
    <button
      onClick={() => fileRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onDrop(e.dataTransfer.files); }}
      className={cn(
        "flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-10 text-xs transition-colors",
        over
          ? "border-neutral-400 bg-neutral-50 text-[var(--color-ink-soft)]"
          : "border-[var(--color-border-strong)] text-[var(--color-ink-faint)] hover:border-neutral-400 hover:text-[var(--color-ink-soft)]",
      )}
    >
      <ImagePlus size={20} />
      Drop images here or click to upload
    </button>
  );
}

function DurationPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const isPreset = DURATION_PRESETS.includes(value);
  return (
    <div className="flex gap-1">
      {DURATION_PRESETS.map((d) => (
        <button
          key={d}
          onClick={() => onChange(d)}
          className={cn(
            "h-10 flex-1 rounded-lg border text-xs font-medium transition-colors",
            value === d
              ? "border-neutral-900 bg-neutral-900 text-white"
              : "border-[var(--color-border-strong)] text-[var(--color-ink-soft)] hover:bg-neutral-50",
          )}
        >
          {d}s
        </button>
      ))}
      <input
        type="number"
        min={1}
        value={!isPreset ? value || "" : ""}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        placeholder="…"
        className={cn(
          "h-10 w-12 rounded-lg border bg-white px-2 text-center text-xs text-[var(--color-ink)] focus:outline-none",
          !isPreset && value ? "border-neutral-900" : "border-[var(--color-border-strong)]",
        )}
        title="Custom seconds"
      />
    </div>
  );
}

function ColorPicker({ value, onChange }: { value: Scene["color"]; onChange: (c: Scene["color"]) => void }) {
  return (
    <div className="flex h-10 items-center gap-1.5 rounded-lg border border-[var(--color-border-strong)] bg-white px-2.5">
      {(Object.keys(COLOR_LABELS) as (keyof typeof COLOR_LABELS)[]).map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          title={COLOR_LABELS[c].label}
          className={cn(
            "h-4 w-4 rounded-full ring-offset-2 ring-offset-white transition-transform hover:scale-110",
            value === c && "ring-2 ring-neutral-900",
            c === "none" && "border border-[var(--color-ink-faint)]",
          )}
          style={{ background: c === "none" ? "transparent" : COLOR_LABELS[c].bar }}
        />
      ))}
    </div>
  );
}

function SuggestField({ label, value, onChange, options, id }: { label: string; value: string; onChange: (v: string) => void; options: string[]; id: string }) {
  return (
    <Field label={label}>
      <Input list={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder="—" />
      <datalist id={id}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </Field>
  );
}

// Model field that makes the project-default fallback explicit.
function ModelField({
  label,
  value,
  onChange,
  options,
  id,
  fallback,
  resolved,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  id: string;
  fallback: string;
  resolved: string;
}) {
  const overriding = value.trim().length > 0;
  const placeholder = fallback.trim() ? `Default: ${fallback}` : "Set a project default in Settings";
  return (
    <Field
      label={label}
      hint={
        overriding ? (
          <button onClick={() => onChange("")} className="text-[var(--color-ember)] hover:opacity-80">
            reset to default
          </button>
        ) : (
          <span className="text-[var(--color-ink-faint)]">{resolved.trim() ? "using default" : "no default"}</span>
        )
      }
    >
      <Input list={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      <datalist id={id}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </Field>
  );
}
