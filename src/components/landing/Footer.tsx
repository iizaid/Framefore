import { useState } from "react";
import { Link } from "react-router-dom";
import { Twitter, Github, MessageSquare, Youtube, ArrowRight, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspaceCta } from "@/components/auth/useWorkspaceCta";
import { Reveal } from "./Reveal";

const FAQS = [
  {
    q: "Does Framefore generate the video?",
    a: "No. Framefore is the planning layer — you export a clean handoff for use with external AI video tools.",
  },
  {
    q: "Where are my projects saved?",
    a: "You need an account to open the workspace. Projects remain local-first in your browser unless a future cloud sync feature is added.",
  },
  {
    q: "Which AI video tools does it support?",
    a: "The exports are paste-ready for tools like Runway, Sora, Veo, Kling, and Luma.",
  },
];

export function Footer() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  // Auth-aware workspace link (signed-out → /signup, never /app directly).
  const cta = useWorkspaceCta();

  return (
    <>
      {/* FAQ / contact */}
      <section id="faq" className="border-t border-[var(--color-border-strong)] bg-[var(--color-bg)] px-6 py-20 sm:py-24">
        <Reveal className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="font-hero text-3xl text-[var(--ff-ink)]">Questions?</h2>
            <p className="mt-3 text-sm text-[var(--color-ink-soft)] leading-relaxed">
              Can't find what you need? Reach us at{" "}
              <a href="mailto:support@framefore.app" className="font-semibold text-[var(--ff-violet)] underline decoration-[var(--color-border-strong)] underline-offset-4 hover:decoration-[var(--ff-violet)]">
                support@framefore.app
              </a>
              .
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {FAQS.map((f, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={f.q}
                  className={cn(
                    "overflow-hidden rounded-2xl border transition-colors duration-300",
                    isOpen ? "border-[var(--ff-violet)] bg-white shadow-sm" : "border-[var(--color-border-strong)] bg-[var(--color-surface)] hover:border-neutral-300 hover:bg-white"
                  )}
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="flex w-full items-center justify-between px-6 py-5 text-left"
                  >
                    <span className="text-sm font-semibold text-[var(--color-ink)]">{f.q}</span>
                    <span className={cn("ml-4 shrink-0 transition-transform duration-300", isOpen ? "rotate-180 text-[var(--ff-violet)]" : "text-[var(--color-ink-faint)]")}>
                      {isOpen ? <Minus size={18} /> : <Plus size={18} />}
                    </span>
                  </button>
                  <div
                    className={cn(
                      "grid transition-all duration-300 ease-in-out",
                      isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="px-6 pb-5 text-sm leading-relaxed text-[var(--color-ink-soft)]">
                        {f.a}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--ff-haiti)] px-6 py-16 text-white sm:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-12 lg:grid-cols-[1fr_2fr]">
            {/* Left Col: Brand & Newsletter */}
            <div className="flex max-w-xs flex-col gap-6">
              <div className="flex items-center gap-2.5">
                <img src="/white.svg" alt="Framefore" className="h-7 w-7" />
                <span className="font-display text-2xl text-white">Framefore</span>
              </div>
              <p className="text-sm leading-relaxed text-white/60">
                Plan AI videos scene by scene. The professional workspace for the next generation of filmmakers.
              </p>
              
              <div className="mt-2">
                <p className="mb-2 text-xs font-semibold uppercase text-white/40">Subscribe to updates</p>
                <form className="relative flex items-center" onSubmit={(e) => e.preventDefault()}>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-4 pr-10 text-sm text-white placeholder:text-white/40 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
                  />
                  <button type="button" className="absolute right-2 grid h-7 w-7 place-items-center rounded-lg bg-white text-[var(--ff-haiti)] transition-transform hover:scale-105" aria-label="Subscribe">
                    <ArrowRight size={14} />
                  </button>
                </form>
              </div>
            </div>

            {/* Right Col: Links */}
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
              <div className="flex flex-col gap-3">
                <span className="text-xs font-semibold uppercase text-white/40">Product</span>
                <a href="#product" className="text-sm text-white/60 transition-colors hover:text-white">Features</a>
                <a href="#canvas" className="text-sm text-white/60 transition-colors hover:text-white">Canvas</a>
                <a href="#pricing" className="text-sm text-white/60 transition-colors hover:text-white">Pricing</a>
                <a href="#faq" className="text-sm text-white/60 transition-colors hover:text-white">FAQ</a>
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-xs font-semibold uppercase text-white/40">Workspace</span>
                <Link to="/login" className="text-sm text-white/60 transition-colors hover:text-white">Log in</Link>
                <Link to="/signup" className="text-sm text-white/60 transition-colors hover:text-white">Sign up</Link>
                <Link to={cta.to} className="text-sm text-white/60 transition-colors hover:text-white">{cta.label}</Link>
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-xs font-semibold uppercase text-white/40">Resources</span>
                <a href="#" className="text-sm text-white/60 transition-colors hover:text-white">Documentation</a>
                <a href="#" className="text-sm text-white/60 transition-colors hover:text-white">Blog</a>
                <a href="#" className="text-sm text-white/60 transition-colors hover:text-white">Community</a>
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-xs font-semibold uppercase text-white/40">Legal</span>
                <span className="cursor-default text-sm text-white/40">Privacy Policy</span>
                <span className="cursor-default text-sm text-white/40">Terms of Service</span>
              </div>
            </div>
          </div>

          <div className="mt-16 flex flex-col items-center justify-between gap-6 border-t border-white/10 pt-8 sm:flex-row">
            <p className="text-xs text-white/40">
              © {new Date().getFullYear()} Framefore. All rights reserved.
            </p>
            
            {/* Socials */}
            <div className="flex items-center gap-4 text-white/40">
              <a href="#" className="transition-colors hover:text-white" aria-label="Twitter">
                <Twitter size={18} />
              </a>
              <a href="#" className="transition-colors hover:text-white" aria-label="GitHub">
                <Github size={18} />
              </a>
              <a href="#" className="transition-colors hover:text-white" aria-label="Discord">
                <MessageSquare size={18} />
              </a>
              <a href="#" className="transition-colors hover:text-white" aria-label="YouTube">
                <Youtube size={18} />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
