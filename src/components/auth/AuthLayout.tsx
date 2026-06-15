import { Link } from "react-router-dom";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-white px-6 py-12">
      <div className="flex w-full max-w-[400px] flex-col">
        {/* Brand / back to landing */}
        <div className="mb-8 flex justify-center">
          <Link to="/" className="group flex items-center gap-2.5">
            <img src="/black.svg" alt="Framefore" className="h-8 w-8" />
            <span className="font-display text-2xl text-[var(--color-charcoal)] transition-opacity group-hover:opacity-70">
              Framefore
            </span>
          </Link>
        </div>

        {/* Centered form container */}
        <div className="w-full">{children}</div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-[var(--color-ink-faint)]">
          © {new Date().getFullYear()} Framefore
        </div>
      </div>
    </div>
  );
}
