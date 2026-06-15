import { CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import { AdminLayout } from "@/admin/components/AdminLayout";
import { AdminShellEmptyState } from "@/admin/components/AdminShellEmptyState";

const CURRENT_STATUS = [
  "AdminGuard is active on /admin.",
  "Owner/admin MVP access is active.",
  "Current-user role helper store is active.",
  "No dashboard data is connected yet.",
];

const NEXT_MODULES = [
  "Overview metrics",
  "Users",
  "Roles",
  "Audit logs",
  "Security events",
  "Storage",
  "System health",
];

const GUARDRAILS = [
  "No fake metrics or fabricated activity.",
  "No service-role key in the browser.",
  "No broad user-content access.",
  "Every privileged mutation must be audited.",
  "/app remains local-first.",
  "Cloud sync is not implemented.",
];

export function AdminPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <section className="rounded-[var(--radius-card)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-soft)]">
                Protected shell
              </p>
              <h2 className="mt-2 font-display text-2xl text-[var(--color-charcoal)]">Admin console</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-ink-soft)]">
                The access shell is protected. Operational modules will be added
                in later phases after their data sources and server-side checks
                exist.
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[var(--color-midnight)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white">
              <ShieldCheck size={14} />
              Guarded
            </span>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[1fr_0.95fr]">
          <section className="rounded-[var(--radius-card)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={17} className="text-[var(--color-ink)]" />
              <h3 className="font-display text-lg text-[var(--color-charcoal)]">Current status</h3>
            </div>
            <ul className="mt-4 space-y-3 text-sm text-[var(--color-ink)]">
              {CURRENT_STATUS.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-midnight)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-[var(--radius-card)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-5">
            <div className="flex items-center gap-2">
              <LockKeyhole size={17} className="text-[var(--color-ink)]" />
              <h3 className="font-display text-lg text-[var(--color-charcoal)]">Production guardrails</h3>
            </div>
            <ul className="mt-4 space-y-3 text-sm text-[var(--color-ink)]">
              {GUARDRAILS.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-midnight)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <AdminShellEmptyState
          title="Operational modules are planned"
          description="These sections are intentionally present as planning markers only. They are disabled until real data producers, RLS/RPC checks, and audit paths exist."
          statusLabel="No data connected"
          bullets={NEXT_MODULES.map((module) => `${module} - planned`)}
        />
      </div>
    </AdminLayout>
  );
}
