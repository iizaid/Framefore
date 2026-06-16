import { Cable, Clock, Film, Frame, Maximize2, MousePointer2, Plus, StickyNote } from "lucide-react";
import { Reveal } from "./Reveal";

const SCENES = [
  { id: "01", title: "Opening hook", meta: "0:04 · Wide", accent: "#834DFB", soft: "#EEE8FF", className: "left-[5%] top-[27%]" },
  { id: "02", title: "Product reveal", meta: "0:06 · Pan", accent: "#0091FF", soft: "#E7F4FF", className: "left-[38%] top-[42%]" },
  { id: "03", title: "Final beat", meta: "0:05 · Close", accent: "#F0E100", soft: "#FFF9B8", className: "left-[70%] top-[29%]" },
];

function MiniSceneCard({ scene }: { scene: (typeof SCENES)[number] }) {
  return (
    <div
      className={`absolute w-44 overflow-hidden rounded-[var(--radius-card)] border bg-white shadow-[var(--ff-shadow-card)] ${scene.className}`}
      style={{ borderColor: scene.accent }}
    >
      <div style={{ background: scene.accent }} className="h-1" />
      <div className="p-3">
        <div className="flex items-center gap-2">
          <span
            style={{ background: scene.accent, color: scene.accent === "#F0E100" ? "var(--ff-haiti)" : "#fff" }}
            className="font-mono-ui grid h-6 min-w-6 place-items-center rounded-md px-1 text-[10px] font-semibold"
          >
            {scene.id}
          </span>
          <span className="truncate text-xs font-semibold text-[var(--ff-ink)]">{scene.title}</span>
        </div>
        <div
          className="mt-3 h-12 rounded-[var(--radius-button)] border"
          style={{ background: scene.soft, borderColor: `${scene.accent}55` }}
        />
        <div className="font-mono-ui mt-2 flex items-center justify-between text-[10px] text-[var(--color-ink-faint)]">
          <span>{scene.meta}</span>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: scene.accent }} />
        </div>
      </div>
    </div>
  );
}

export function DemoVideoSection() {
  return (
    <section id="canvas" className="px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-[1200px]">
        <Reveal>
          <div className="mb-8 grid gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <h2 className="font-hero text-3xl leading-tight text-[var(--ff-ink)] sm:text-5xl">
                Map the production before generation.
              </h2>
            </div>
            <p className="max-w-xl text-base leading-relaxed text-[var(--color-ink-soft)] lg:ml-auto">
              Framefore treats the canvas as planning space and the timeline as final order, so your visual map stays useful without changing export semantics.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="card-surface overflow-hidden rounded-[var(--radius-large)] p-3">
            <div className="dot-canvas relative h-[420px] overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] sm:h-[500px]">
              <div className="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-[var(--color-border)] bg-white/95 p-1.5 shadow-[0_18px_44px_-28px_rgba(18,43,165,0.38)] backdrop-blur">
                {[MousePointer2, Cable, Plus, StickyNote, Frame].map((Icon, index) => (
                  <span
                    key={index}
                    className={`grid h-8 w-8 place-items-center rounded-full ${
                      index === 0 ? "bg-[var(--ff-haiti)] text-white" : "text-[var(--color-ink-soft)]"
                    }`}
                  >
                    <Icon size={14} />
                  </span>
                ))}
                <span className="mx-0.5 h-5 w-px bg-[var(--color-border)]" />
                <span className="grid h-8 w-8 place-items-center rounded-full text-[var(--color-ink-soft)]">
                  <Maximize2 size={14} />
                </span>
              </div>

              <div className="absolute left-[4%] top-[17%] h-[66%] w-[28%] rounded-[var(--radius-large)] border border-dashed border-[var(--color-border-strong)]" />
              <div className="absolute left-[36%] top-[17%] h-[66%] w-[29%] rounded-[var(--radius-large)] border border-dashed border-[var(--color-border-strong)]" />
              <div className="absolute left-[69%] top-[17%] h-[66%] w-[27%] rounded-[var(--radius-large)] border border-dashed border-[var(--color-border-strong)]" />

              <svg className="absolute inset-0 h-full w-full" aria-hidden>
                <defs>
                  <marker id="ff-showcase-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(131,77,251,0.65)" />
                  </marker>
                </defs>
                <path d="M 150 170 C 245 170, 250 220, 345 220" fill="none" stroke="rgba(131,77,251,0.55)" strokeWidth="1.8" markerEnd="url(#ff-showcase-arrow)" />
                <path d="M 495 235 C 590 235, 590 172, 690 172" fill="none" stroke="rgba(131,77,251,0.55)" strokeWidth="1.8" markerEnd="url(#ff-showcase-arrow)" />
              </svg>

              {SCENES.map((scene) => <MiniSceneCard key={scene.id} scene={scene} />)}

              <div className="absolute bottom-[8%] left-[37%] w-48 rounded-[var(--radius-card)] border border-[var(--ff-yellow-border)] bg-[var(--ff-yellow-soft)] p-3 shadow-[var(--ff-shadow-card)]">
                <div className="font-mono-ui flex items-center gap-1.5 text-[10px] font-semibold uppercase text-[var(--ff-haiti)]">
                  <StickyNote size={11} /> Continuity note
                </div>
                <p className="mt-1 text-[11px] leading-snug text-[var(--ff-haiti)]">
                  Keep lighting consistent between the reveal and final beat.
                </p>
              </div>
            </div>

            <div className="mt-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-2">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ff-ink)]">
                  <Film size={13} className="text-[var(--ff-violet)]" /> Timeline order
                </span>
                <span className="font-mono-ui flex items-center gap-1 text-[11px] text-[var(--color-ink-faint)]">
                  <Clock size={11} /> 0:15
                </span>
              </div>
              <div className="flex gap-1.5">
                {SCENES.map((scene, index) => (
                  <div
                    key={scene.id}
                    className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-[var(--radius-button)] border px-2 text-xs"
                    style={{ background: scene.soft, borderColor: scene.accent, borderTopWidth: 3 }}
                  >
                    <span
                      className="font-mono-ui grid h-5 min-w-5 place-items-center rounded px-1 text-[10px] font-semibold"
                      style={{ background: scene.accent, color: scene.accent === "#F0E100" ? "var(--ff-haiti)" : "#fff" }}
                    >
                      {index + 1}
                    </span>
                    <span className="truncate font-semibold text-[var(--ff-ink)]">{scene.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
