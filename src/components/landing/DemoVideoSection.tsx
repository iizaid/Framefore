import { useState } from "react";
import { Play } from "lucide-react";
import { Reveal } from "./Reveal";
import { VideoLightbox } from "./VideoLightbox";



export function DemoVideoSection() {
  const [open, setOpen] = useState(false);

  return (
    <section id="canvas" className="px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <div className="mb-10 text-center">
            <h2 className="font-hero text-3xl text-[var(--ff-ink)] sm:text-4xl">
              See Framefore in action.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[var(--color-ink-soft)]">
              Watch how a rough idea becomes a structured AI video plan — scenes, notes, references,
              timeline order, and export-ready prompts.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          {/* Dotted canvas wrapper keeps the product visual language */}
          <div className="dot-canvas rounded-[var(--radius-large)] border border-[var(--color-border)] p-4 shadow-[var(--ff-shadow-card)] sm:p-6">
            {/* Video card */}
            <button
              type="button"
              className="group relative w-full cursor-pointer overflow-hidden rounded-[var(--radius-card)] bg-[var(--ff-haiti)] shadow-[0_24px_60px_-36px_rgba(24,16,43,0.65)] ring-1 ring-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ff-violet)]"
              onClick={() => setOpen(true)}
              aria-label="Play Framefore demo video"
            >
              <div className="relative aspect-video flex items-center justify-center">
                {/* Gradient background fill */}
                <div className="absolute inset-0 bg-[var(--ff-haiti)]" />

                {/* Subtle inner dot grid */}
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: "radial-gradient(rgba(245,243,255,0.25) 1px, transparent 1px)",
                    backgroundSize: "22px 22px",
                  }}
                />

                {/* Faint scene/card ghost shapes for visual depth */}


                {/* Center play button */}
                <div className="relative z-10 flex flex-col items-center gap-4">
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-white shadow-2xl transition-transform duration-300 group-hover:scale-110">
                    <Play size={22} className="ml-1 text-neutral-900" fill="currentColor" />
                  </div>
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/70 backdrop-blur-sm">
                    Demo coming soon
                  </span>
                </div>

                {/* Hover glow */}
                <div className="absolute inset-0 bg-white/[0.03] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </div>
            </button>


          </div>
        </Reveal>
      </div>

      <VideoLightbox open={open} onClose={() => setOpen(false)} />
    </section>
  );
}
