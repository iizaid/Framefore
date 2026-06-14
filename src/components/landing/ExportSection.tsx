import { Package, Hash, Table, Mic, FileJson } from "lucide-react";
import { Reveal } from "./Reveal";


const FORMATS = [
  { icon: Package, label: "Prompt Pack", desc: "Generation-ready prompts, one block per scene." },
  { icon: Hash, label: "Markdown", desc: "Full production document with canvas context." },
  { icon: Table, label: "Shot List", desc: "A production table of every scene." },
  { icon: Mic, label: "Narration", desc: "The voiceover script on its own." },
  { icon: FileJson, label: "JSON Backup", desc: "Complete, restorable project data." },
];

export function ExportSection() {
  return (
    <section className="px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <Reveal className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="font-hero text-3xl text-[var(--color-charcoal)] sm:text-4xl">
              Export the plan.<br />Generate with confidence.
            </h2>

            <p className="mt-4 text-base leading-relaxed text-[var(--color-ink-soft)]">
              When your scenes are ready, Framefore turns your timeline, prompts, notes, references,
              narration, and canvas relationships into clean production files you can use with external AI video tools.
            </p>

            <p className="mt-4 text-xs text-[var(--color-ink-faint)]">
              Framefore prepares files for use with external AI video tools. It does not generate
              video itself.
            </p>
          </div>

          <div className="card-surface rounded-2xl p-2.5">
            <div className="flex flex-col gap-1.5">
              {FORMATS.map(({ icon: Icon, label, desc }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-[var(--color-surface-2)]"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--color-stone-surface)] text-[var(--color-ink)]">
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[var(--color-ink)]">{label}</div>
                    <div className="truncate text-xs text-[var(--color-ink-soft)]">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
