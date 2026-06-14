import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Users, BarChart3, Settings } from "lucide-react";

// Placeholder admin shell. No real permissions or data — this only reserves the
// route and visual structure. Phase 4.2 adds a Supabase-backed role guard and
// real panels here.
const PANELS = [
  { icon: Users, title: "Users", desc: "Accounts, roles, and access." },
  { icon: BarChart3, title: "Usage", desc: "Projects, exports, and activity." },
  { icon: Settings, title: "Configuration", desc: "Plans, limits, and feature flags." },
];

export function AdminPage() {
  return (
    <div className="dot-canvas min-h-screen bg-[var(--color-bg)] px-6 py-10">
      <div className="mx-auto max-w-4xl">
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
            <p className="text-sm text-[var(--color-ink-soft)]">Admin dashboard coming soon.</p>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)]/60 px-4 py-3 text-sm text-[var(--color-ink-soft)]">
          This area is reserved for a future phase. Roles and permissions are not active yet.
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {PANELS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card-surface rounded-[var(--radius-card)] p-5 opacity-70">
              <div className="mb-3 grid h-9 w-9 place-items-center rounded-lg bg-[var(--color-stone-surface)] text-[var(--color-ink)]">
                <Icon size={16} />
              </div>
              <h3 className="text-sm font-semibold text-[var(--color-ink)]">{title}</h3>
              <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
