import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Loader2, ShieldAlert } from "lucide-react";

type AdminAccessStateProps = {
  message?: string;
};

function AdminAccessShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[var(--color-bg)] px-6 py-10">
      <div className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center shadow-sm">
        {children}
      </div>
    </div>
  );
}

export function AdminAccessLoading() {
  return (
    <AdminAccessShell>
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-stone-surface)] text-[var(--color-ink)]">
        <Loader2 size={18} className="animate-spin" />
      </div>
      <h1 className="mt-4 font-display text-xl text-[var(--color-charcoal)]">Checking admin access</h1>
      <p className="mt-2 text-sm text-[var(--color-ink-soft)]">Please wait while your session is verified.</p>
    </AdminAccessShell>
  );
}

export function AdminForbidden() {
  return (
    <AdminAccessShell>
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-stone-surface)] text-[var(--color-ink)]">
        <ShieldAlert size={18} />
      </div>
      <h1 className="mt-4 font-display text-xl text-[var(--color-charcoal)]">Access denied</h1>
      <p className="mt-2 text-sm text-[var(--color-ink-soft)]">You do not have access to the admin console.</p>
      <div className="mt-5 flex justify-center gap-3">
        <Link
          to="/app"
          className="inline-flex items-center justify-center rounded-lg bg-[var(--color-midnight)] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Back to app
        </Link>
        <Link
          to="/profile"
          className="inline-flex items-center justify-center rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-stone-surface)]"
        >
          Profile
        </Link>
      </div>
    </AdminAccessShell>
  );
}

export function AdminUnavailable({ message = "Admin access is temporarily unavailable." }: AdminAccessStateProps) {
  return (
    <AdminAccessShell>
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-stone-surface)] text-[var(--color-ink)]">
        <AlertTriangle size={18} />
      </div>
      <h1 className="mt-4 font-display text-xl text-[var(--color-charcoal)]">Admin unavailable</h1>
      <p className="mt-2 text-sm text-[var(--color-ink-soft)]">{message}</p>
      <Link
        to="/"
        className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-stone-surface)]"
      >
        <ArrowLeft size={15} />
        Back to home
      </Link>
    </AdminAccessShell>
  );
}
