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
import { copyToClipboard, downloadFile, formatDuration, slugify } from "@/lib/utils";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/primitives";
import { cn } from "@/lib/utils";
import { toast } from "./ui/toast";

type FormatKey = "promptPack" | "markdown" | "json" | "text" | "narration" | "sceneList" | "shotList";

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

// Everything else — supporting exports, visually secondary.
const SECONDARY: Format[] = [
  { key: "markdown", label: "Markdown", desc: "Full structured document", icon: <Hash size={14} />, ext: "md", mime: "text/markdown" },
  { key: "shotList", label: "Shot List", desc: "Production table", icon: <Table size={14} />, ext: "md", mime: "text/markdown" },
  { key: "narration", label: "Narration", desc: "Voiceover script only", icon: <Mic size={14} />, ext: "txt", mime: "text/plain" },
  { key: "sceneList", label: "Scene List", desc: "Quick outline", icon: <ListOrdered size={14} />, ext: "txt", mime: "text/plain" },
  { key: "text", label: "Plain Text", desc: "Simple readable export", icon: <FileText size={14} />, ext: "txt", mime: "text/plain" },
  { key: "json", label: "JSON Backup", desc: "Complete data backup", icon: <FileJson size={14} />, ext: "json", mime: "application/json" },
];

const ALL: Format[] = [PRIMARY, ...SECONDARY];

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
  const missingPrompts = project.scenes.filter((s) => !s.visualPrompt.trim()).length;
  const missingNarration = project.scenes.filter((s) => !s.narrationPart.trim()).length;
  const hasScenes = sceneCount > 0;

  const copy = async () => {
    const ok = await copyToClipboard(content);
    toast(ok ? "Copied to clipboard" : "Copy failed", ok ? "success" : "error");
  };
  const download = () => {
    downloadFile(`${slugify(project.title)}.${fmt.ext}`, content, fmt.mime);
    toast("File downloaded");
  };

  return (
    <Modal open={open} onClose={onClose} title="Export video plan" className="max-w-3xl">
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
          {/* ── Format choices ── */}
          <div className="flex flex-col gap-3">
            {/* Primary recommendation */}
            <button
              onClick={() => setActive("promptPack")}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors",
                active === "promptPack"
                  ? "border-neutral-900 bg-neutral-900/[0.04] ring-1 ring-neutral-900/10"
                  : "border-[var(--color-border-strong)] hover:bg-[var(--color-surface-2)]",
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-neutral-900">{PRIMARY.icon}</span>
                <span className="text-sm font-semibold text-[var(--color-ink)]">{PRIMARY.label}</span>
                <span className="ml-auto rounded-full bg-[#121212] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                  Recommended
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-snug text-[var(--color-ink-faint)]">{PRIMARY.desc}</p>
            </button>

            {/* Secondary formats */}
            <div>
              <span className="mb-1.5 block px-1 text-[10px] font-medium uppercase tracking-wide text-[var(--color-ink-faint)]">
                Other formats
              </span>
              <div className="flex flex-col">
                {SECONDARY.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setActive(f.key)}
                    title={f.desc}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors",
                      active === f.key
                        ? "bg-[var(--color-surface-2)] text-[var(--color-ink)]"
                        : "text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-2)]",
                    )}
                  >
                    <span className={active === f.key ? "text-[var(--color-ink)]" : "text-[var(--color-ink-faint)]"}>{f.icon}</span>
                    <span className="text-[13px] font-medium">{f.label}</span>
                    {active === f.key && <Check size={13} className="ml-auto text-[var(--color-ink-faint)]" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Preview + actions ── */}
          <div className="flex min-w-0 flex-col">
            {/* Stat line */}
            <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--color-ink-soft)]">
              <span className="font-medium text-[var(--color-ink)]">{fmt.label}</span>
              <span className="text-[var(--color-ink-faint)]">·</span>
              <span>{sceneCount} scene{sceneCount === 1 ? "" : "s"}</span>
              <span className="text-[var(--color-ink-faint)]">·</span>
              <span>{formatDuration(totalSec)}</span>
              {missingPrompts > 0 && (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                  {missingPrompts} missing prompt{missingPrompts === 1 ? "" : "s"}
                </span>
              )}
              {missingNarration > 0 && (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                  {missingNarration} missing narration
                </span>
              )}
            </div>

            <pre className="no-scrollbar h-[320px] overflow-auto rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg)] p-3.5 text-[11px] leading-relaxed text-[var(--color-ink-soft)] whitespace-pre-wrap break-words">
              {content || "This format is empty for the current scenes."}
            </pre>

            <div className="mt-3 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={download} disabled={!content}>
                <Download size={14} /> Download .{fmt.ext}
              </Button>
              <Button variant="primary" size="sm" onClick={copy} disabled={!content}>
                <Copy size={14} /> Copy
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
