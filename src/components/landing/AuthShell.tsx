import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

// Shared frame for the /login and /signup placeholders. Visually consistent with
// the landing page; the dotted canvas reinforces the product identity. Phase 4.2
// will replace the disabled provider buttons with real Supabase OAuth.
export function AuthShell({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="dot-canvas relative flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg)] px-6 py-12">
      <Link
        to="/"
        className="absolute left-5 top-5 inline-flex items-center gap-1.5 text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
      >
        <ArrowLeft size={15} /> Back
      </Link>

      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2.5">
          <img src="/black.svg" alt="Framefore" className="h-8 w-8" />
          <span className="font-display text-2xl text-[var(--color-charcoal)]">Framefore</span>
        </Link>

        <div className="card-surface rounded-2xl bg-[var(--color-surface)] p-7">
          <h1 className="text-center text-xl font-semibold text-[var(--color-ink)]">{title}</h1>
          <p className="mt-1.5 text-center text-sm text-[var(--color-ink-soft)]">{subtitle}</p>
          {children}
        </div>

        <p className="mt-6 text-center text-sm text-[var(--color-ink-soft)]">{footer}</p>
      </div>
    </div>
  );
}

// Disabled OAuth buttons — structure only, no auth wired yet.
export function ProviderButtons() {
  const providers = [
    { name: "Continue with Google", glyph: "G" },
    { name: "Continue with GitHub", glyph: "" },
  ];
  return (
    <div className="mt-6 flex flex-col gap-2.5">
      {providers.map((p) => (
        <button
          key={p.name}
          disabled
          title="Auth coming in the next phase"
          className="flex h-11 w-full items-center justify-center gap-2.5 rounded-full border border-[var(--color-border-strong)] bg-white text-sm font-medium text-[var(--color-ink)] opacity-60"
        >
          <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--color-stone-surface)] text-xs font-bold">
            {p.glyph}
          </span>
          {p.name}
        </button>
      ))}

      <div className="my-1 flex items-center gap-3 text-[11px] uppercase tracking-wide text-[var(--color-ink-faint)]">
        <span className="h-px flex-1 bg-[var(--color-border-strong)]" />
        or
        <span className="h-px flex-1 bg-[var(--color-border-strong)]" />
      </div>

      <button
        disabled
        title="Email auth coming in the next phase"
        className="h-11 w-full rounded-full bg-[var(--color-stone-surface)] text-sm font-medium text-[var(--color-ink-faint)]"
      >
        Email login (coming soon)
      </button>

      <p className="mt-1 text-center text-[11px] text-[var(--color-ink-faint)]">
        Auth coming in the next phase — no sign-in needed to use the app.
      </p>
    </div>
  );
}
