import { Link } from "react-router-dom";
import { AuthVideoPanel } from "./AuthVideoPanel";

interface AuthLayoutProps {
  children: React.ReactNode;
}

// Full-screen split layout used by /login and /signup.
// Left  = white form panel
// Right = black animated cat panel (hidden on mobile, shown from md up)
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen w-full">
      {/* ── Left: form panel ─────────────────────────────── */}
      <div className="flex w-full flex-col md:w-1/2">
        {/* Back to landing */}
        <div className="flex items-center px-8 pt-8">
          <Link
            to="/"
            className="flex items-center gap-2.5 group"
          >
            <img src="/black.svg" alt="Framefore" className="h-7 w-7" />
            <span className="font-display text-lg text-[var(--color-charcoal)] transition-opacity group-hover:opacity-70">
              Framefore
            </span>
          </Link>
        </div>

        {/* Centered form */}
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm">
            {children}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 text-center text-xs text-[var(--color-ink-faint)]">
          © {new Date().getFullYear()} Framefore
        </div>
      </div>

      {/* ── Right: animation panel (desktop only) ────────── */}
      <div className="hidden md:block md:w-1/2">
        <div className="sticky top-0 h-screen w-full">
          <AuthVideoPanel />
        </div>
      </div>
    </div>
  );
}
