import { useState } from "react";
import { Wand2 } from "lucide-react";
import type { Project } from "@/types";
import { useStore } from "@/store/useStore";
import { detectDirection, formatDuration, wordCount } from "@/lib/utils";
import { narrationSeconds } from "@/lib/estimate";
import { Modal } from "./ui/Modal";
import { AutoTextarea, Button, Field } from "./ui/primitives";
import { DirectionToggle } from "./ui/widgets";
import { toast } from "./ui/toast";

// The full spoken script for the whole video, with a one-click distributor that
// splits it across scenes. Lifted out of the sidebar into its own focused surface.
export function ScriptDialog({ open, onClose, project }: { open: boolean; onClose: () => void; project: Project }) {
  const updateProject = useStore((s) => s.updateProject);
  const updateScene = useStore((s) => s.updateScene);
  const [dir, setDir] = useState<"ltr" | "rtl">(detectDirection(project.narration));
  const scriptSec = narrationSeconds(project.narration);

  const autoAssign = () => {
    const text = project.narration.trim();
    if (!text || project.scenes.length === 0) {
      toast("Write a script and add scenes first", "info");
      return;
    }
    const sentences = text.match(/[^.!?؟。\n]+[.!?؟。]?/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
    const per = Math.ceil(sentences.length / project.scenes.length);
    project.scenes.forEach((scene, i) => {
      updateScene(project.id, scene.id, { narrationPart: sentences.slice(i * per, (i + 1) * per).join(" ") });
    });
    toast("Narration distributed across scenes");
  };

  return (
    <Modal open={open} onClose={onClose} title="Full Script" description="Write the whole voiceover here, then distribute it across your scenes." className="max-w-2xl">
      <div className="space-y-3">
        <Field hint={<DirectionToggle dir={dir} onChange={setDir} />}>
          <AutoTextarea
            dir={dir}
            value={project.narration}
            onChange={(e) => updateProject(project.id, { narration: e.target.value })}
            placeholder="Paste or write the entire spoken script here…"
            minRows={8}
            className="max-h-[50vh] overflow-y-auto"
          />
        </Field>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[11px] text-[var(--color-ink-faint)]">
            {wordCount(project.narration)} words · ~{formatDuration(scriptSec)}
          </span>
          <Button variant="subtle" size="sm" className="w-full sm:w-auto" onClick={autoAssign} disabled={project.scenes.length === 0}>
            <Wand2 size={14} /> Distribute across {project.scenes.length} scene{project.scenes.length === 1 ? "" : "s"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
