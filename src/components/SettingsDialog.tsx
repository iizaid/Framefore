import { useState } from "react";
import { Send, Cpu, Sliders } from "lucide-react";
import type { AspectRatio, Platform, Project } from "@/types";
import { ASPECT_RATIOS, IMAGE_MODELS, PLATFORMS, VIDEO_MODELS } from "@/lib/constants";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";
import { Modal } from "./ui/Modal";
import { Field, Input, Select } from "./ui/primitives";
import { SettingsPanel } from "./SettingsPanel";

type TabKey = "publishing" | "models" | "style";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "publishing", label: "Publishing", icon: <Send size={15} /> },
  { key: "models", label: "Default Models", icon: <Cpu size={15} /> },
  { key: "style", label: "Global Style", icon: <Sliders size={15} /> },
];

// Project-level settings: publishing target, default AI models, and global creative
// direction. These were previously scattered across the sidebar — now consolidated.
export function SettingsDialog({ open, onClose, project }: { open: boolean; onClose: () => void; project: Project }) {
  const updateProject = useStore((s) => s.updateProject);
  const [tab, setTab] = useState<TabKey>("publishing");

  const set = <K extends keyof Project>(k: K, v: Project[K]) => updateProject(project.id, { [k]: v });

  return (
    <Modal open={open} onClose={onClose} title="Project Settings" className="max-w-xl">
      {/* Tabs */}
      <div className="-mt-1 mb-5 flex gap-1 border-b border-[var(--color-border)]">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-medium transition-colors",
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

      <div className="max-h-[60vh] overflow-y-auto pr-1">
        {tab === "publishing" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Target platform">
                <Select value={project.platform} onChange={(e) => set("platform", e.target.value as Platform)}>
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Aspect ratio">
                <Select value={project.aspectRatio} onChange={(e) => set("aspectRatio", e.target.value as AspectRatio)}>
                  {ASPECT_RATIOS.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Target length (minutes)" hint={<span className="text-[var(--color-ink-faint)]">0 = unset</span>}>
              <Input
                type="number"
                min={0}
                value={project.targetLengthSec ? Math.round(project.targetLengthSec / 60) : ""}
                onChange={(e) => set("targetLengthSec", (Number(e.target.value) || 0) * 60)}
                placeholder="0"
              />
            </Field>
            <p className="text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
              Publishing is set once for the whole project. Framefore recommends the best platforms based on your aspect ratio and total length in the Overview panel.
            </p>
          </div>
        )}

        {tab === "models" && (
          <div className="space-y-4">
            <Field label="Default image model">
              <Input list="default-img-models" value={project.defaultImageModel} onChange={(e) => set("defaultImageModel", e.target.value)} placeholder="e.g. Midjourney v7" />
              <datalist id="default-img-models">
                {IMAGE_MODELS.map((m) => <option key={m} value={m} />)}
              </datalist>
            </Field>
            <Field label="Default video model">
              <Input list="default-vid-models" value={project.defaultVideoModel} onChange={(e) => set("defaultVideoModel", e.target.value)} placeholder="e.g. Google Veo 3" />
              <datalist id="default-vid-models">
                {VIDEO_MODELS.map((m) => <option key={m} value={m} />)}
              </datalist>
            </Field>
            <p className="text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
              Every scene uses these models by default. Override a model on individual scenes only when you need something different — that resolved model is shown on each card and included in your export.
            </p>
          </div>
        )}

        {tab === "style" && <SettingsPanel project={project} />}
      </div>
    </Modal>
  );
}
