import { useMemo, useState } from "react";
import { Copy, Download, FileJson, FileText, Hash, Mic, ListOrdered, Package, Table, Check } from "lucide-react";
import type { Project } from "@/types";
import {
  narrationOnly,
  sceneListOnly,
  toJSON,
  toMarkdown,
  toPlainText,
  toPromptPack,
  toShotList,
} from "@/lib/export";
import { totalSceneSeconds } from "@/lib/estimate";
import { productionChecklist } from "@/lib/readiness";
import { copyToClipboard, downloadFile, formatDuration, slugify } from "@/lib/utils";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/primitives";
import { cn } from "@/lib/utils";
import { toast } from "./ui/toast";

type FormatKey = "promptPack" | "markdown" | "shotList" | "narration" | "json" | "sceneList" | "text";

interface Format {
  key: FormatKey;
  label: string;
  desc: string;
  icon: React.ReactNode;
  ext: string;
  mime: string;
}

// The one format that matches this app's purpose — paste-ready prompts.
const PRIMARY: Format = {
  key: "promptPack",
  label: "Prompt Pack",
  desc: "Generation-ready prompts for Runway, Sora, Veo, Kling…",
  icon: <Package size={16} />,
  ext: "txt",
  mime: "text/plain",
};

// Production-tier supporting documents.
const PRODUCTION: Format[] = [
  { key: "markdown", label: "Markdown", desc: "Full structured document with canvas context", icon: <Hash size={14} />, ext: "md", mime: "text/markdown" },
  { key: "shotList", label: "Shot List", desc: "Production table", icon: <Table size={14} />, ext: "md", mime: "text/markdown" },
  { key: "narration", label: "Narration", desc: "Voiceover script only", icon: <Mic size={14} />, ext: "txt", mime: "text/plain" },
];

// Backup-tier — complete, restorable.
const BACKUP: Format[] = [
  { key: "json", label: "JSON Backup", desc: "Complete project data", icon: <FileJson size={14} />, ext: "json", mime: "application/json" },
];

// Minor plain formats, kept available but de-emphasized.
const MORE: Format[] = [
  { key: "sceneList", label: "Scene List", desc: "Quick outline", icon: <ListOrdered size={14} />, ext: "txt", mime: "text/plain" },
  { key: "text", label: "Plain Text", desc: "Simple readable export", icon: <FileText size={14} />, ext: "txt", mime: "text/plain" },
];

const ALL: Format[] = [PRIMARY, ...PRODUCTION, ...BACKUP, ...MORE];

// Compact badge wording for each readiness check.
const SHORT_LABEL: Record<string, string> = {
  prompt: "no prompt",
  narration: "no narration",
  images: "no references",
  transition: "no transition",
  notes: "loose notes",
  sections: "empty sections",
  labels: "unlabeled links",
};

const builders: Record<FormatKey, (p: Project) => string> = {
  promptPack: toPromptPack,
  markdown: toMarkdown,
  json: toJSON,
  text: toPlainText,
  narration: narrationOnly,
  sceneList: sceneListOnly,
  shotList: toShotList,
};

export function ExportDialog({ open, onClose, project }: { open: boolean; onClose: () => void; project: Project }) {
  const [active, setActive] = useState<FormatKey>("promptPack");
  const content = useMemo(() => builders[active](project), [active, project]);
  const fmt = ALL.find((f) => f.key === active)!;

  const sceneCount = project.scenes.length;
  const totalSec = totalSceneSeconds(project.scenes);
  const hasScenes = sceneCount > 0;
  const checklist = useMemo(() => productionChecklist(project).filter((c) => c.count > 0), [project]);
  const noteCount = (project.canvasNotes ?? []).filter((n) => n.text.trim()).length;
  const sectionCount = (project.canvasSections ?? []).length;

  const copy = async () => {
    const ok = await copyToClipboard(content);
    toast(ok ? "Copied to clipboard" : "Copy failed", ok ? "success" : "error");
  };
  const download = () => {
    downloadFile(`${slugify(project.title)}-${fmt.key}.${fmt.ext}`, content, fmt.mime);
    toast(`Downloaded ${fmt.label}`);
  };

  return (
    <Modal open={open} onClose={onClose} title="Production handoff" className="max-w-3xl max-sm:max-h-[92dvh]">
      {!hasScenes ? (
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--color-border-strong)] py-16 text-center">
          <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[var(--color-surface-2)] text-[var(--color-ink-faint)]">
            <Package size={22} />
          </div>
          <h3 className="text-sm font-semibold text-[var(--color-ink)]">Nothing to export yet</h3>
          <p className="mt-1 max-w-xs text-xs text-[var(--color-ink-soft)]">
            Add scenes with prompts and narration, then come back to export a paste-ready plan for your AI video tool.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-[230px_1fr]">
          {/* ── Format choices, grouped by purpose ── */}
          <div className="flex flex-col gap-3">
            <FormatGroup label="Generate">
              <PrimaryFormatBtn format={PRIMARY} active={active === "promptPack"} onClick={() => setActive("promptPack")} />
            </FormatGroup>
            <FormatGroup label="Production">
              {PRODUCTION.map((f) => (
                <FormatRow key={f.key} format={f} active={active === f.key} onClick={() => setActive(f.key)} />
              ))}
            </FormatGroup>
            <FormatGroup label="Backup">
              {BACKUP.map((f) => (
                <FormatRow key={f.key} format={f} active={active === f.key} onClick={() => setActive(f.key)} />
              ))}
            </FormatGroup>
            <FormatGroup label="More formats">
              {MORE.map((f) => (
                <FormatRow key={f.key} format={f} active={active === f.key} onClick={() => setActive(f.key)} />
              ))}
            </FormatGroup>
          </div>

          {/* ── Readiness summary + preview + actions ── */}
          <div className="flex min-w-0 flex-col">
            {/* Readiness badges */}
            <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px]">
              <Badge tone="neutral">{sceneCount} scene{sceneCount === 1 ? "" : "s"}</Badge>
              <Badge tone="neutral">{formatDuration(totalSec)}</Badge>
              {sectionCount > 0 && <Badge tone="neutral">{sectionCount} section{sectionCount === 1 ? "" : "s"}</Badge>}
              {noteCount > 0 && <Badge tone="neutral">{noteCount} note{noteCount === 1 ? "" : "s"}</Badge>}
              {checklist.length === 0 ? (
                <Badge tone="ok">Ready to export</Badge>
              ) : (
                checklist.map((c) => (
                  <Badge key={c.key} tone="warn" title={c.label}>
                    {c.count} {SHORT_LABEL[c.key] ?? c.label}
                  </Badge>
                ))
              )}
            </div>

            <pre className="no-scrollbar h-[240px] overflow-auto rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg)] p-3.5 text-[11px] leading-relaxed text-[var(--color-ink-soft)] whitespace-pre-wrap break-words sm:h-[320px]">
              {content || "This format is empty for the current scenes."}
            </pre>

            <div className="sticky bottom-0 -mx-4 mt-3 flex justify-end gap-2 border-t border-[var(--color-border)] bg-white px-4 py-3 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
              <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={download} disabled={!content}>
                <Download size={14} /> Download .{fmt.ext}
              </Button>
              <Button variant="primary" size="sm" className="flex-1 sm:flex-none" onClick={copy} disabled={!content}>
                <Copy size={14} /> Copy
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function FormatGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="font-mono-ui mb-1.5 block px-1 text-[10px] font-medium uppercase text-[var(--color-ink-faint)]">
        {label}
      </span>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function PrimaryFormatBtn({ format, active, onClick }: { format: Format; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "min-h-20 rounded-xl border p-3 text-left transition-colors",
        active
          ? "border-[var(--ff-violet)] bg-[var(--ff-blue-chalk)] ring-1 ring-[var(--color-accent-glow)]"
          : "border-[var(--color-border-strong)] hover:bg-[var(--color-surface-2)]",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-[var(--ff-violet)]">{format.icon}</span>
        <span className="text-sm font-semibold text-[var(--color-ink)]">{format.label}</span>
        <span className="ml-auto rounded-full bg-[var(--ff-haiti)] px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white">
          Recommended
        </span>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-[var(--color-ink-faint)]">{format.desc}</p>
    </button>
  );
}

function FormatRow({ format, active, onClick }: { format: Format; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={format.desc}
      className={cn(
        "flex min-h-10 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors",
        active ? "bg-[var(--color-surface-2)] text-[var(--color-ink)]" : "text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-2)]",
      )}
    >
      <span className={active ? "text-[var(--color-ink)]" : "text-[var(--color-ink-faint)]"}>{format.icon}</span>
      <span className="text-[13px] font-medium">{format.label}</span>
      {active && <Check size={13} className="ml-auto text-[var(--color-ink-faint)]" />}
    </button>
  );
}

function Badge({ children, tone, title }: { children: React.ReactNode; tone: "neutral" | "ok" | "warn"; title?: string }) {
  return (
    <span
      title={title}
      className={cn(
        "rounded-full px-1.5 py-0.5 font-medium",
        tone === "neutral" && "bg-[var(--color-surface-2)] text-[var(--color-ink-soft)]",
        tone === "ok" && "bg-emerald-100 text-emerald-800",
        tone === "warn" && "bg-amber-100 text-amber-800",
      )}
    >
      {children}
    </span>
  );
}
