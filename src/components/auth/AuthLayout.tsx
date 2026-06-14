import { Link } from "react-router-dom";
import { AuthVideoPanel } from "./AuthVideoPanel";

interface AuthLayoutProps {
  children: React.ReactNode;
}

// Full-screen split layout used by /login and /signup.
// Left  = white form panel (full width on mobile)
// Right = black animated panel (hidden below md to avoid overflow on phones)
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-white">
      {/* ── Left: form panel ─────────────────────────────── */}
      <div className="flex w-full flex-col md:w-1/2">
        {/* Brand / back to landing */}
        <div className="flex items-center px-6 pt-8 sm:px-8">
          <Link to="/" className="group flex items-center gap-2.5">
            <img src="/black.svg" alt="Framefore" className="h-7 w-7" />
            <span className="font-display text-lg text-[var(--color-charcoal)] transition-opacity group-hover:opacity-70">
              Framefore
            </span>
          </Link>
        </div>

        {/* Centered form */}
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm">{children}</div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-8 text-center text-xs text-[var(--color-ink-faint)] sm:px-8">
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
