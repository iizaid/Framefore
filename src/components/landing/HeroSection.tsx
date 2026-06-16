import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { useWorkspaceCta } from "@/components/auth/useWorkspaceCta";

const HEADLINE = ["Plan AI videos", "scene by scene."];



export function HeroSection() {
  const reduce = useReducedMotion();
  // Auth-aware primary CTA: signed-out visitors go to /signup (never /app).
  const cta = useWorkspaceCta();

  return (
    <section className="relative z-0 flex min-h-[74vh] flex-col items-center justify-center overflow-hidden bg-[var(--ff-blue-chalk)] px-6 pb-24 pt-32 text-center sm:pt-36">
      <div className="absolute inset-0 -z-10 opacity-80">
        <div className="absolute left-1/2 top-28 h-56 w-56 -translate-x-1/2 rounded-full bg-[var(--ff-violet)]/10 blur-3xl" />
        <div className="absolute right-[18%] top-44 h-20 w-20 rounded-full bg-[var(--ff-yellow)]/35 blur-2xl" />
      </div>

      <h1 className="font-hero max-w-5xl text-balance text-[2.75rem] leading-[1.02] text-[var(--ff-ink)] sm:text-6xl lg:text-[76px]">
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
        className="mt-7 max-w-2xl text-balance text-base leading-relaxed text-[var(--color-ink-soft)] sm:text-lg"
      >
        Organize scenes, prompts, references, notes, and timeline order before you generate in external AI video tools.
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
          <Button variant="outline" size="md" className="w-full bg-white sm:w-auto">
            <Play size={15} /> See how it works
          </Button>
        </a>
      </motion.div>
    </section>
  );
}
