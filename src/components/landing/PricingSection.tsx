import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { useWorkspaceCta } from "@/components/auth/useWorkspaceCta";
import { Reveal, RevealGroup, RevealItem } from "./Reveal";

// Honest pricing — no checkout exists yet, so CTAs route to the (free) app or a
// waitlist placeholder. Phase 4.2+ can wire real billing behind these buttons.
interface Tier {
  name: string;
  price: string;
  cadence?: string;
  tagline: string;
  features: string[];
  cta: { label: string; to?: string; disabled?: boolean; workspace?: boolean };
  featured?: boolean;
}

const TIERS: Tier[] = [
  {
    name: "Free",
    price: "$0",
    tagline: "Everything you need to plan your first videos.",
    features: ["Local projects in your browser", "Scene planning", "Canvas board", "Basic export"],
    cta: { label: "Start free", workspace: true },
  },
  {
    name: "Creator",
    price: "$12",
    cadence: "/mo",
    tagline: "For creators shipping regularly.",
    features: [
      "More projects",
      "Advanced export formats",
      "Canvas notes & sections",
      "Production checklist",
    ],
    cta: { label: "Coming soon", disabled: true },
    featured: true,
  },
  {
    name: "Studio",
    price: "Custom",
    tagline: "For agencies and production teams.",
    features: [
      "Team & admin-ready",
      "Advanced workflow",
      "Priority future features",
      "Best for production teams",
    ],
    cta: { label: "Join waitlist", to: "/login" },
  },
];

export function PricingSection() {
  // Resolve the free-tier CTA to an auth-aware target (signed-out → /signup).
  const workspaceCta = useWorkspaceCta();
  return (
    <section id="pricing" className="px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-[1200px]">
        <Reveal>
          <div className="mb-12 text-center">
            <h2 className="font-hero text-3xl leading-tight text-[var(--ff-ink)] sm:text-5xl">
              Simple, honest pricing.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[var(--color-ink-soft)]">
              Start free with local projects. Paid plans arrive as Framefore grows — no surprises.
            </p>
          </div>
        </Reveal>

        <RevealGroup className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {TIERS.map((t) => (
            <RevealItem
              key={t.name}
              className={cn(
                "relative flex h-full flex-col rounded-[var(--radius-card)] p-6",
                t.featured
                  ? "border border-[var(--ff-violet)] bg-white shadow-[0_30px_60px_-42px_rgba(131,77,251,0.50)]"
                  : "card-surface",
              )}
            >
              {t.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--ff-haiti)] px-3 py-1 text-[10px] font-semibold uppercase text-white">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-[var(--color-ink)]">{t.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-3xl text-[var(--ff-ink)]">{t.price}</span>
                {t.cadence && <span className="text-sm text-[var(--color-ink-faint)]">{t.cadence}</span>}
              </div>
              <p className="mt-2 text-sm text-[var(--color-ink-soft)]">{t.tagline}</p>

              <ul className="mt-5 flex flex-1 flex-col gap-2.5">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[var(--color-ink-soft)]">
                    <Check size={16} className="mt-0.5 shrink-0 text-[var(--ff-violet)]" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {t.cta.disabled ? (
                  <Button variant="subtle" size="md" className="w-full" disabled>
                    {t.cta.label}
                  </Button>
                ) : (
                  <Link to={t.cta.workspace ? workspaceCta.to : t.cta.to!}>
                    <Button variant={t.featured ? "primary" : "outline"} size="md" className="w-full">
                      {t.cta.label}
                    </Button>
                  </Link>
                )}
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
