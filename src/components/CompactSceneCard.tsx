import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import {
  GripVertical,
  Copy,
  CopyPlus,
  Trash2,
  Clock,
  Clapperboard,
  Pencil,
  MoreHorizontal,
  AlertTriangle,
  ImageIcon,
  Link2,
  CornerDownRight,
} from "lucide-react";
import type { Project, Scene } from "@/types";
import { cn, copyToClipboard, formatDuration } from "@/lib/utils";
import { scenePrompt } from "@/lib/export";
import { resolvedVideoModel } from "@/lib/models";
import { essentialGaps } from "@/lib/colors";
import { STATUS_STYLE } from "@/lib/constants";
import { useStore } from "@/store/useStore";
import { ConfirmDialog } from "./ui/Modal";
import { ImageThumb } from "./ui/widgets";
import { toast } from "./ui/toast";

export function CompactSceneCard({
  scene,
  index,
  project,
  isLast,
  isActive,
  onEdit,
  onSelect,
}: {
  scene: Scene;
  index: number;
  project: Project;
  isLast: boolean;
  isActive: boolean;
  onEdit: () => void;
  onSelect: () => void;
}) {
  const deleteScene = useStore((s) => s.deleteScene);
  const duplicateScene = useStore((s) => s.duplicateScene);

  const [confirmDel, setConfirmDel] = useState(false);
  const [menu, setMenu] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: scene.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const cover = scene.images[0];
  const gaps = essentialGaps(scene);
  const resolvedVid = resolvedVideoModel(scene, project);
  const promptPreview = scene.visualPrompt.trim() || scene.summary.trim();
  const narrationPreview = scene.narrationPart.trim();
  const hasContinuity = scene.continuityNotes.trim().length > 0 || scene.endingBeat.trim().length > 0;
  const statusStyle = STATUS_STYLE[scene.status];

  const handleCopyPrompt = async () => {
    const ok = await copyToClipboard(scenePrompt(scene, project.global));
    toast(ok ? "Scene prompt copied" : "Copy failed", ok ? "success" : "error");
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      id={`scene-${scene.id}`}
      className="relative grid scroll-mt-24 grid-cols-[36px_1fr] gap-3 pb-6 sm:grid-cols-[44px_1fr] sm:gap-5"
    >
      {/* ── Story-flow rail ── */}
      <div className="relative flex flex-col items-center">
        <div
          {...attributes}
          {...listeners}
          className={cn(
            "group/node z-10 grid h-8 w-8 cursor-grab touch-none place-items-center rounded-full border bg-white text-[13px] font-semibold tabular-nums shadow-sm transition-colors active:cursor-grabbing sm:h-9 sm:w-9 sm:text-sm",
            isActive
              ? "border-[var(--color-ink)] bg-[#121212] text-white"
              : "border-[var(--color-border-strong)] text-[var(--color-ink-soft)] group-hover/card:border-[var(--color-ink)] group-hover/card:bg-neutral-50 group-hover/card:text-[var(--color-ink)]",
          )}
          title="Drag to reorder"
          aria-label={`Scene ${index + 1}, drag to reorder`}
        >
          <span className="group-hover/node:hidden">{String(index + 1).padStart(2, "0")}</span>
          <GripVertical size={16} className={cn("hidden group-hover/node:block", isActive ? "text-white/70" : "text-[var(--color-ink-faint)]")} />
        </div>
        {!isLast && (
          <div className="absolute bottom-0 top-8 flex w-4 flex-col items-center sm:top-9">
            <div className={cn("w-[2px] flex-1 transition-colors", isActive ? "bg-[var(--color-ink-faint)]" : "bg-[var(--color-border-strong)] group-hover/card:bg-[var(--color-ink-faint)]")} />
            <svg viewBox="0 0 10 10" className={cn("h-2.5 w-2.5 -translate-y-1 transition-colors", isActive ? "text-[var(--color-ink-faint)]" : "text-[var(--color-border-strong)] group-hover/card:text-[var(--color-ink-faint)]")}>
              <path d="M1 3L5 7L9 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>

      {/* ── Card ── */}
      <motion.div
        layout
        onClick={onSelect}
        className={cn(
          "group/card relative flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-[var(--radius-card)] border bg-white transition-all duration-200 sm:flex-row",
          isDragging
            ? "border-neutral-400 shadow-lg"
            : "border-[var(--color-border-strong)] hover:border-neutral-300 hover:shadow-[0_6px_22px_-8px_rgba(0,0,0,0.12)]",
          isActive && "border-neutral-400 ring-2 ring-neutral-900/15 ring-offset-2 ring-offset-[var(--color-bg)]",
        )}
      >

        {/* Thumbnail area */}
        <div className="shrink-0 px-3 pt-3 sm:pb-3 sm:pr-0">
          {cover ? (
            <ImageThumb id={cover.id} alt={scene.title} className="h-40 w-full rounded-lg object-cover ring-1 ring-inset ring-black/10 sm:h-36 sm:w-56" />
          ) : (
            <div className="flex h-40 w-full items-center justify-center rounded-lg bg-[var(--color-surface-2)] text-[var(--color-ink-faint)] ring-1 ring-inset ring-[var(--color-border-strong)] sm:h-36 sm:w-56">
              <ImageIcon size={24} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col p-3 pt-2 sm:p-4 sm:pl-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={cn("h-2 w-2 shrink-0 rounded-full", statusStyle.dot)}
                  title={`Status: ${scene.status}`}
                />
                <h3 className="font-display truncate text-lg leading-snug text-[var(--color-ink)]">
                  {scene.title || <span className="font-sans text-[15px] font-normal text-[var(--color-ink-faint)]">Untitled scene</span>}
                </h3>
                {gaps.length > 0 && (
                  <div
                    className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800"
                    title={`Missing: ${gaps.join(", ")}`}
                  >
                    <AlertTriangle size={10} />
                    {gaps.length === 1 ? `Needs ${gaps[0]}` : `${gaps.length} missing`}
                  </div>
                )}
              </div>
            </div>
            
            {/* actions */}
            <div className="relative -mr-1 -mt-1 ml-auto flex items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:focus-within:opacity-100 sm:group-hover/card:opacity-100" onClick={(e) => e.stopPropagation()}>
              <IconBtn title="Edit" onClick={onEdit}><Pencil size={14} /></IconBtn>
              <IconBtn title="Copy prompt" onClick={handleCopyPrompt}><Copy size={14} /></IconBtn>
              <IconBtn title="More" onClick={() => setMenu((m) => !m)}><MoreHorizontal size={14} /></IconBtn>
              {menu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                  <div className="absolute right-0 top-8 z-20 w-40 overflow-hidden rounded-lg border border-[var(--color-border-strong)] bg-white py-1 shadow-lg">
                    <MenuItem icon={<Pencil size={14} />} label="Edit" onClick={() => { setMenu(false); onEdit(); }} />
                    <MenuItem icon={<Copy size={14} />} label="Copy prompt" onClick={() => { setMenu(false); handleCopyPrompt(); }} />
                    <MenuItem icon={<CopyPlus size={14} />} label="Duplicate" onClick={() => { setMenu(false); duplicateScene(project.id, scene.id); }} />
                    <MenuItem icon={<Trash2 size={14} />} label="Delete" danger onClick={() => { setMenu(false); setConfirmDel(true); }} />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-2 space-y-1.5">
            {promptPreview && (
              <p className="line-clamp-1 text-[13px] text-[var(--color-ink-soft)]">{promptPreview}</p>
            )}
            {narrationPreview && (
              <p className="line-clamp-1 text-[12px] italic text-[var(--color-ink-faint)]">“{narrationPreview}”</p>
            )}
          </div>

          <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
            {scene.role !== "none" && (
              <span className="rounded-full bg-[#121212] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                {scene.role}
              </span>
            )}
            <span className="flex items-center gap-1 rounded-md bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-ink-soft)]">
              <Clock size={11} /> {formatDuration(scene.durationSec)}
            </span>
            {resolvedVid && (
              <span className="flex items-center gap-1 rounded-md bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-ink-soft)]">
                <Clapperboard size={11} /> {resolvedVid}
              </span>
            )}
            {hasContinuity && (
              <span
                className="flex items-center gap-1 rounded-md bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-ink-soft)]"
                title="Has continuity / ending-beat notes"
              >
                <Link2 size={11} /> Linked
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Transition label riding the connector to the next scene */}
      {!isLast && scene.transitionToNext.trim() && (
        <div className="pointer-events-none absolute bottom-1 left-[44px] z-10 sm:left-[60px]">
          <span className="inline-flex max-w-[260px] items-center gap-1 rounded-full border border-[var(--color-border-strong)] bg-white px-2 py-0.5 text-[10px] font-medium text-[var(--color-ink-faint)] shadow-sm">
            <CornerDownRight size={10} className="shrink-0" />
            <span className="truncate">{scene.transitionToNext}</span>
          </span>
        </div>
      )}

      <ConfirmDialog
        open={confirmDel}
        onClose={() => setConfirmDel(false)}
        onConfirm={() => deleteScene(project.id, scene.id)}
        title="Delete scene?"
        message={`Scene ${index + 1}${scene.title ? ` — ${scene.title}` : ""} will be removed.`}
      />
    </div>
  );
}

function IconBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      className="grid h-9 w-9 place-items-center rounded-md text-[var(--color-ink-faint)] transition-colors hover:bg-[var(--color-stone-surface)] hover:text-[var(--color-ink)] sm:h-7 sm:w-7"
    >
      {children}
    </button>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-[var(--color-surface-2)]",
        danger ? "text-rose-600" : "text-[var(--color-ink)]",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
