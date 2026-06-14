import { MousePointer2, Cable, Plus, StickyNote as StickyNoteIcon, Frame, Maximize2, Film } from "lucide-react";
import { Reveal } from "./Reveal";

// A polished static marketing illustration of the canvas — NOT real React Flow.
// It mirrors the workspace language: dotted pane, a floating toolbar, scene cards
// styled like the app, labelled section frames, a note, smooth connectors, and a
// timeline strip reinforcing "the timeline is the final order".

function SceneCard({
  index,
  title,
  meta,
  ready,
  className,
}: {
  index: number;
  title: string;
  meta: string;
  ready: number;
  className: string;
}) {
  return (
    <div
      className={`absolute w-44 rounded-xl border border-[var(--color-border-strong)] bg-white p-3 shadow-[0_18px_44px_-28px_rgba(0,0,0,0.55)] ${className}`}
    >
      <div className="flex items-center gap-2">
        <span className="grid h-5 w-5 place-items-center rounded-md bg-[var(--color-midnight)] text-[10px] font-semibold text-white">
          {index}
        </span>
        <span className="truncate text-xs font-semibold text-[var(--color-ink)]">{title}</span>
      </div>
      {/* thumbnail strip */}
      <div className="mt-2.5 h-12 rounded-lg bg-gradient-to-br from-[var(--color-stone-surface)] to-[#ece9e4]" />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] text-[var(--color-ink-faint)]">{meta}</span>
        <span className="flex items-center gap-1 text-[10px] font-medium text-[var(--color-ink-soft)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-meadow)]" />
          {ready}%
        </span>
      </div>
    </div>
  );
}

function SectionFrame({ label, className }: { label: string; className: string }) {
  return (
    <div className={`absolute rounded-2xl border border-dashed border-[var(--color-fog)] ${className}`}>
      <span className="absolute -top-2.5 left-3 rounded bg-[var(--color-surface-2)] px-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink-faint)]">
        {label}
      </span>
    </div>
  );
}

export function CanvasShowcase() {
  return (
    <section id="canvas" className="px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <div className="mb-10 max-w-2xl">
            <h2 className="font-hero text-3xl text-[var(--color-charcoal)] sm:text-4xl">
              Map your video before generating it.
            </h2>
            <p className="mt-3 text-[var(--color-ink-soft)]">
              Arrange scenes, notes, and story sections on a visual canvas while the timeline keeps
              the final video order clean.
            </p>
          </div>
        </Reveal>

        <Reveal y={32}>
          <div className="card-surface rounded-2xl p-2.5 shadow-[0_40px_80px_-50px_rgba(0,0,0,0.5)]">
            {/* Canvas pane */}
            <div className="dot-canvas relative h-[380px] overflow-hidden rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] sm:h-[440px]">
              {/* Floating toolbar hint */}
              <div className="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-[var(--color-border-strong)] bg-white/95 p-1.5 shadow-[0_14px_40px_-22px_rgba(0,0,0,0.45)] backdrop-blur">
                {[MousePointer2, Cable, Plus, StickyNoteIcon, Frame].map((Icon, i) => (
                  <span
                    key={i}
                    className={`grid h-7 w-7 place-items-center rounded-full ${
                      i === 0 ? "bg-[var(--color-midnight)] text-white" : "text-[var(--color-ink-soft)]"
                    }`}
                  >
                    <Icon size={13} />
                  </span>
                ))}
                <span className="mx-0.5 h-4 w-px bg-[var(--color-border-strong)]" />
                <span className="grid h-7 w-7 place-items-center rounded-full text-[var(--color-ink-soft)]">
                  <Maximize2 size={13} />
                </span>
              </div>

              {/* Section frames */}
              <SectionFrame label="Hook" className="left-[4%] top-[16%] h-[68%] w-[27%]" />
              <SectionFrame label="Setup" className="left-[36%] top-[16%] h-[68%] w-[29%]" />
              <SectionFrame label="Climax" className="left-[69%] top-[16%] h-[68%] w-[27%]" />

              {/* Connectors */}
              <svg className="absolute inset-0 h-full w-full" aria-hidden>
                <defs>
                  <marker id="cs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill="var(--color-ash)" />
                  </marker>
                </defs>
                <path d="M 150 150 C 240 150, 250 195, 330 195" fill="none" stroke="var(--color-ash)" strokeWidth="1.5" markerEnd="url(#cs-arrow)" />
                <path d="M 480 215 C 575 215, 585 165, 665 165" fill="none" stroke="var(--color-ash)" strokeWidth="1.5" markerEnd="url(#cs-arrow)" />
              </svg>

              {/* Scene cards */}
              <SceneCard index={1} title="Opening shot" meta="0:04 · Wide" ready={90} className="left-[5%] top-[28%]" />
              <SceneCard index={2} title="Wide reveal" meta="0:06 · Pan" ready={70} className="left-[38%] top-[40%]" />
              <SceneCard index={3} title="Final beat" meta="0:05 · Close" ready={85} className="left-[70%] top-[30%]" />

              {/* Production note, connected to scene 2 visually */}
              <div className="absolute bottom-[8%] left-[37%] w-44 rounded-xl border border-[var(--color-sunburst)]/40 bg-[#fff8e6] p-3 shadow-[0_18px_44px_-28px_rgba(0,0,0,0.55)]">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#9a7a16]">
                  <StickyNoteIcon size={11} /> Note
                </div>
                <p className="mt-1 text-[11px] leading-snug text-[#6b5512]">
                  Match the lighting from scene 1 for continuity.
                </p>
              </div>
            </div>

            {/* Timeline strip */}
            <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-[var(--color-border-strong)] bg-white px-3 py-2.5">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-faint)]">
                <Film size={12} /> Timeline
              </span>
              <div className="flex flex-1 items-center gap-1.5">
                {[
                  { w: "w-[22%]", l: "1" },
                  { w: "w-[34%]", l: "2" },
                  { w: "w-[28%]", l: "3" },
                ].map((seg) => (
                  <div
                    key={seg.l}
                    className={`flex h-7 ${seg.w} items-center justify-center rounded-md bg-[var(--color-stone-surface)] text-[10px] font-medium text-[var(--color-ink-soft)]`}
                  >
                    Scene {seg.l}
                  </div>
                ))}
              </div>
              <span className="text-[11px] text-[var(--color-ink-faint)]">0:15</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
