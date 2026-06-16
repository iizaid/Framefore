import {
  X,
  Pencil,
  Copy,
  CopyPlus,
  Trash2,
  Clock,
  ImageIcon,
  Clapperboard,
  Wand2,
  AlertTriangle,
  CornerDownRight,
  Link2,
} from "lucide-react";
import { useState } from "react";
import type { Project, Scene } from "@/types";
import { cn, copyToClipboard, formatDuration } from "@/lib/utils";
import { scenePrompt } from "@/lib/export";
import { resolvedImageModel, resolvedVideoModel } from "@/lib/models";
import { essentialGaps, sceneColor } from "@/lib/colors";
import { getAutoSceneColor } from "@/lib/sceneColors";
import { STATUS_STYLE } from "@/lib/constants";
import { useStore } from "@/store/useStore";
import { ConfirmDialog } from "./ui/Modal";
import { ImageThumb } from "./ui/widgets";
import { toast } from "./ui/toast";

// Right-side panel for the single selected scene. It is intentionally read-only
// (a quick glance + shortcuts) — deep editing happens in SceneEditorModal via
// the "Edit full scene" button. Project-level stats live elsewhere on purpose.
export function SceneInspector({
  project,
  scene,
  index,
  onClose,
  onEdit,
}: {
  project: Project;
  scene: Scene;
  index: number;
  onClose: () => void;
  onEdit: () => void;
}) {
  const duplicateScene = useStore((s) => s.duplicateScene);
  const deleteScene = useStore((s) => s.deleteScene);
  const [confirmDel, setConfirmDel] = useState(false);

  const cover = scene.images[0];
  const gaps = essentialGaps(scene);
  const status = STATUS_STYLE[scene.status];
  const imageModel = resolvedImageModel(scene, project);
  const videoModel = resolvedVideoModel(scene, project);
  const promptPreview = scene.visualPrompt.trim() || scene.summary.trim();
  const narrationPreview = scene.narrationPart.trim();
  const continuity = scene.continuityNotes.trim();
  const autoColor = getAutoSceneColor(scene.id, index);
  const userColor = scene.color !== "none" ? sceneColor(scene.color) : null;
  const accent = userColor ? userColor.hex : autoColor.accent;
  const softAccent = userColor ? "var(--color-surface-2)" : autoColor.soft;

  const handleCopyPrompt = async () => {
    const ok = await copyToClipboard(scenePrompt(scene, project.global));
    toast(ok ? "Scene prompt copied" : "Copy failed", ok ? "success" : "error");
  };

  const handleDelete = () => {
    deleteScene(project.id, scene.id);
    onClose();
  };

  return (
    <>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-3">
          <span
            style={{ background: accent, color: accent === "#F0E100" ? "var(--ff-haiti)" : "#fff" }}
            className="font-mono-ui grid h-7 w-7 shrink-0 place-items-center rounded-[var(--radius-button)] text-[12px] font-semibold tabular-nums"
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold leading-tight text-[var(--color-ink)]">
              {scene.title || <span className="font-normal text-[var(--color-ink-faint)]">Untitled scene</span>}
            </h2>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--color-ink-faint)]">
              <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
              {scene.status}
              <span>·</span>
              <Clock size={10} /> {formatDuration(scene.durationSec)}
            </div>
          </div>
          <button
            onClick={onClose}
            title="Close inspector"
            aria-label="Close inspector"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[var(--color-ink-faint)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {/* Cover */}
          {cover ? (
            <ImageThumb id={cover.id} alt={scene.title} className="h-32 w-full rounded-lg object-cover ring-1 ring-inset ring-black/10" />
          ) : (
            <div
              style={{ background: softAccent, boxShadow: `inset 0 0 0 1px ${accent}33` }}
              className="flex h-32 w-full items-center justify-center rounded-[var(--radius-card)] text-[var(--color-ink-faint)]"
            >
              <ImageIcon size={22} />
            </div>
          )}

          {/* Quick facts */}
          <div className="flex flex-wrap items-center gap-1.5">
            {scene.role !== "none" && (
              <span className="rounded-full bg-[var(--ff-haiti)] px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                {scene.role}
              </span>
            )}
            <Chip icon={<ImageIcon size={11} />}>
              {scene.images.length} ref{scene.images.length === 1 ? "" : "s"}
            </Chip>
            {scene.continuityNotes.trim() || scene.endingBeat.trim() ? (
              <Chip icon={<Link2 size={11} />}>Linked</Chip>
            ) : null}
          </div>

          {/* Missing essentials */}
          {gaps.length > 0 && (
            <div className="flex items-start gap-2 rounded-[10px] bg-[var(--ff-yellow-soft)] px-3 py-2 ring-1 ring-[var(--ff-yellow-border)]">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[var(--ff-haiti)]" />
              <div className="text-[12px] leading-snug text-[var(--ff-haiti)]">
                <span className="font-medium">Missing essentials:</span> {gaps.join(", ")}
              </div>
            </div>
          )}

          {/* Prompt preview */}
          <Field label="Prompt">
            {promptPreview ? (
              <p className="line-clamp-4 whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--color-ink-soft)]">{promptPreview}</p>
            ) : (
              <Empty>No prompt yet</Empty>
            )}
          </Field>

          {/* Narration preview */}
          <Field label="Narration">
            {narrationPreview ? (
              <p className="line-clamp-4 whitespace-pre-wrap text-[13px] italic leading-relaxed text-[var(--color-ink-faint)]">“{narrationPreview}”</p>
            ) : (
              <Empty>No narration assigned</Empty>
            )}
          </Field>

          {/* Transition to next */}
          <Field label="Transition to next">
            {scene.transitionToNext.trim() ? (
              <p className="flex items-start gap-1.5 text-[13px] leading-relaxed text-[var(--color-ink-soft)]">
                <CornerDownRight size={13} className="mt-0.5 shrink-0 text-[var(--color-ink-faint)]" />
                {scene.transitionToNext.trim()}
              </p>
            ) : (
              <Empty>None set</Empty>
            )}
          </Field>

          {/* Continuity notes */}
          {continuity && (
            <Field label="Continuity notes">
              <p className="line-clamp-3 whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--color-ink-soft)]">{continuity}</p>
            </Field>
          )}

          {/* Models */}
          <div className="grid grid-cols-2 gap-2">
            <ModelChip icon={<Wand2 size={12} />} label="Image" value={imageModel} />
            <ModelChip icon={<Clapperboard size={12} />} label="Video" value={videoModel} />
          </div>
        </div>

        {/* Sticky actions footer */}
        <div className="space-y-2 border-t border-[var(--color-border)] px-4 py-3">
          <button
            onClick={onEdit}
            className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-button)] bg-[var(--ff-carbon)] py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--ff-haiti)]"
          >
            <Pencil size={14} /> Edit full scene
          </button>
          <div className="grid grid-cols-3 gap-2">
            <ActionBtn icon={<Copy size={14} />} label="Copy" onClick={handleCopyPrompt} />
            <ActionBtn icon={<CopyPlus size={14} />} label="Duplicate" onClick={() => duplicateScene(project.id, scene.id)} />
            <ActionBtn icon={<Trash2 size={14} />} label="Delete" danger onClick={() => setConfirmDel(true)} />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDel}
        onClose={() => setConfirmDel(false)}
        onConfirm={handleDelete}
        title="Delete scene?"
        message={`Scene ${index + 1}${scene.title ? ` — ${scene.title}` : ""} will be removed.`}
      />
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-mono-ui mb-1 text-[11px] font-medium uppercase text-[var(--color-ink-faint)]">{label}</div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] italic text-[var(--color-ink-faint)]">{children}</p>;
}

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1 rounded-md bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-ink-soft)]">
      {icon} {children}
    </span>
  );
}

function ModelChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[10px] bg-[var(--color-surface-2)] p-2.5">
      <div className="font-mono-ui flex items-center gap-1 text-[10px] font-medium uppercase text-[var(--color-ink-faint)]">
        {icon} {label}
      </div>
      <div className="mt-0.5 truncate text-[12px] font-medium text-[var(--color-ink)]" title={value || undefined}>
        {value || <span className="font-normal italic text-[var(--color-ink-faint)]">Not set</span>}
      </div>
    </div>
  );
}

function ActionBtn({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 rounded-[10px] border py-2 text-[11px] font-medium transition-colors",
        danger
          ? "border-[var(--color-border-strong)] text-rose-600 hover:border-rose-200 hover:bg-rose-50"
          : "border-[var(--color-border-strong)] text-[var(--color-ink-soft)] hover:border-neutral-300 hover:bg-[var(--color-surface-2)]",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
