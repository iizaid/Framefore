import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { useWorkspaceCta } from "@/components/auth/useWorkspaceCta";

const HEADLINE = ["Build AI videos", "before you generate them."];



export function HeroSection() {
  const reduce = useReducedMotion();
  // Auth-aware primary CTA: signed-out visitors go to /signup (never /app).
  const cta = useWorkspaceCta();

  return (
    <section className="relative z-0 flex min-h-[85vh] flex-col items-center justify-center overflow-hidden px-6 pb-32 pt-36 text-center sm:pt-44">
      {/* Background Video */}
      <div className="absolute inset-0 -z-20 h-full w-full bg-neutral-950">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover opacity-90"
          src="/hero%20section%20video/hero%20section%20video.mp4"
        />
        {/* Subtle overall dark overlay for text readability */}
        <div className="absolute inset-0 bg-neutral-950/40" />
        {/* Short gradient overlay at the very bottom for a smooth blend into the page */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[var(--color-bg)]" />
      </div>

      <h1 className="font-hero max-w-4xl text-balance text-[2.6rem] leading-[1.02] text-white sm:text-6xl lg:text-7xl">
        {HEADLINE.map((line, li) => (
          <span key={li} className="block">
            {line.split(" ").map((w, i) => (
              <motion.span
                key={i}
                initial={reduce ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + (li * 4 + i) * 0.06, duration: 0.5, ease: "easeOut" }}
                className="inline-block"
              >
                {w}&nbsp;
              </motion.span>
            ))}
          </span>
        ))}
      </h1>

      <motion.p
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.6 }}
        className="mt-7 max-w-xl text-balance text-base text-white/80 sm:text-lg"
      >
        Plan scenes, organize prompts, and perfect your vision before using AI video tools.
      </motion.p>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.85, duration: 0.6 }}
        className="mt-9 flex flex-col items-center gap-3 sm:flex-row"
      >
        <Link to={cta.to} className="w-full sm:w-auto">
          <Button variant="primary" size="md" className="w-full sm:w-auto">
            {cta.label} <ArrowRight size={16} />
          </Button>
        </Link>
        <a href="#canvas" className="w-full sm:w-auto">
          <Button variant="subtle" size="md" className="w-full bg-white text-black hover:bg-white/90 sm:w-auto">
            <Play size={15} /> See how it works
          </Button>
        </a>
      </motion.div>
    </section>
  );
}
