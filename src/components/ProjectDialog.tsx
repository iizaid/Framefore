import { useEffect, useState } from "react";
import type { AspectRatio, Platform, Project } from "@/types";
import { ASPECT_RATIOS, PLATFORMS } from "@/lib/constants";
import { Modal } from "./ui/Modal";
import { Button, Field, Input, Select, Textarea } from "./ui/primitives";

export interface ProjectDraft {
  title: string;
  description: string;
  topic: string;
  platform: Platform;
  aspectRatio: AspectRatio;
  targetMinutes: number;
  visualStyle: string;
  mood: string;
}

const blankDraft = (): ProjectDraft => ({
  title: "",
  description: "",
  topic: "",
  platform: "YouTube",
  aspectRatio: "16:9",
  targetMinutes: 0,
  visualStyle: "",
  mood: "",
});

export function ProjectDialog({
  open,
  onClose,
  onSubmit,
  initial,
  mode,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (draft: ProjectDraft) => void;
  initial?: Project;
  mode: "create" | "edit";
}) {
  const [draft, setDraft] = useState<ProjectDraft>(blankDraft());

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setDraft({
        title: initial.title,
        description: initial.description,
        topic: initial.topic,
        platform: initial.platform,
        aspectRatio: initial.aspectRatio,
        targetMinutes: initial.targetLengthSec ? Math.round(initial.targetLengthSec / 60) : 0,
        visualStyle: initial.visualStyle,
        mood: initial.mood,
      });
    } else {
      setDraft(blankDraft());
    }
  }, [open, initial]);

  const set = <K extends keyof ProjectDraft>(k: K, v: ProjectDraft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const submit = () => {
    if (!draft.title.trim()) return;
    onSubmit(draft);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "create" ? "New Project" : "Project Settings"}
      description={
        mode === "create"
          ? "Set up the foundation of your video. You can change all of this later."
          : undefined
      }
    >
      <div className="space-y-4">
        <Field label="Project title">
          <Input
            autoFocus
            value={draft.title}
            onChange={(e) => set("title", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && e.metaKey && submit()}
            placeholder="e.g. Dark Web Story Video"
          />
        </Field>
        <Field label="Short description">
          <Textarea
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="One or two lines about what this video is."
            className="min-h-[60px]"
          />
        </Field>
        <Field label="Video topic">
          <Input
            value={draft.topic}
            onChange={(e) => set("topic", e.target.value)}
            placeholder="e.g. True crime / cybersecurity"
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Target platform">
            <Select value={draft.platform} onChange={(e) => set("platform", e.target.value as Platform)}>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Aspect ratio">
            <Select
              value={draft.aspectRatio}
              onChange={(e) => set("aspectRatio", e.target.value as AspectRatio)}
            >
              {ASPECT_RATIOS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Target length (min)">
            <Input
              type="number"
              min={0}
              value={draft.targetMinutes || ""}
              onChange={(e) => set("targetMinutes", Number(e.target.value) || 0)}
              placeholder="0"
            />
          </Field>
          <Field label="Visual style">
            <Input
              value={draft.visualStyle}
              onChange={(e) => set("visualStyle", e.target.value)}
              placeholder="Cinematic"
            />
          </Field>
          <Field label="Mood">
            <Input
              value={draft.mood}
              onChange={(e) => set("mood", e.target.value)}
              placeholder="Dark, tense"
            />
          </Field>
        </div>
        <div className="flex flex-col-reverse justify-end gap-2 pt-1 sm:flex-row">
          <Button variant="outline" className="sm:w-auto" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" className="sm:w-auto" onClick={submit} disabled={!draft.title.trim()}>
            {mode === "create" ? "Create Project" : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
