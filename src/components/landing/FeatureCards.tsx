import { Film, LayoutGrid, FileText, Image, Mic, Package } from "lucide-react";
import { Reveal, RevealGroup, RevealItem } from "./Reveal";

const FEATURES = [
  { icon: Film, title: "Scene planning", desc: "Break a video into scenes with duration, camera, mood, and status." },
  { icon: LayoutGrid, title: "Canvas workflow", desc: "Arrange scenes, notes, and sections on an infinite board." },
  { icon: FileText, title: "Prompt organization", desc: "Keep visual and negative prompts structured per scene." },
  { icon: Image, title: "Reference control", desc: "Attach look references so the visual direction stays consistent." },
  { icon: Mic, title: "Narration timing", desc: "Balance voiceover across scenes and track total runtime." },
  { icon: Package, title: "Production export", desc: "Hand off a prompt pack, shot list, markdown, or JSON backup." },
];

export function FeatureCards() {
  return (
    <section id="product" className="px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <div className="mb-12 max-w-2xl">
            <h2 className="font-hero text-3xl text-[var(--ff-ink)] sm:text-4xl">
              Everything before you hit generate.
            </h2>
            <p className="mt-3 text-[var(--color-ink-soft)]">
              The planning layer between a rough idea and an AI video tool — so you generate with
              intent instead of guessing.
            </p>
          </div>
        </Reveal>

        <RevealGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <RevealItem key={title}>
              <div className="card-surface group h-full rounded-[var(--radius-card)] p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_24px_46px_-32px_rgba(18,43,165,0.35)]">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-[var(--ff-haiti)] text-white transition-transform duration-200 group-hover:scale-105">
                  <Icon size={18} />
                </div>
                <h3 className="text-base font-semibold text-[var(--color-ink)]">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-ink-soft)]">{desc}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
