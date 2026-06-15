import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export function AdminPage() {
  return (
    <div className="dot-canvas min-h-screen bg-[var(--color-bg)] px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
        >
          <ArrowLeft size={15} /> Back to site
        </Link>

        <div className="mt-8 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--color-midnight)] text-white">
            <ShieldCheck size={20} />
          </span>
          <div>
            <h1 className="font-display text-2xl text-[var(--color-charcoal)]">Admin</h1>
            <p className="text-sm text-[var(--color-ink-soft)]">Admin access foundation is being prepared.</p>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)]/60 px-4 py-3 text-sm text-[var(--color-ink-soft)]">
          Phase B only adds read-only role helpers for the current signed-in user.
          AdminGuard, navigation, users, audit logs, and dashboard panels are not
          implemented yet.
        </div>
      </div>
    </div>
  );
}
