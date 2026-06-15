import { ArrowLeft, ShieldCheck, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { AdminRoleBadge } from "@/admin/components/AdminRoleBadge";
import { useAdminRoleStore } from "@/admin/store/useAdminRoleStore";

export function AdminTopbar() {
  const roles = useAdminRoleStore((s) => s.roles);

  return (
    <header className="border-b border-[var(--color-border-strong)] bg-[var(--color-bg)]/95 px-4 py-3 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-xl text-[var(--color-charcoal)]">Admin console</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-ink)]">
              <ShieldCheck size={13} />
              MVP access: owner/admin
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
            Protected shell for future operational modules.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:justify-end">
          <div className="flex flex-wrap items-center gap-1.5">
            {roles.length > 0 ? (
              roles.map((role) => <AdminRoleBadge key={role} role={role} />)
            ) : (
              <span className="rounded-full border border-[var(--color-border-strong)] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">
                Roles verified
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/app"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--color-midnight)] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              <ArrowLeft size={15} />
              Back to app
            </Link>
            <Link
              to="/profile"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-stone-surface)]"
            >
              <UserRound size={15} />
              Profile
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
