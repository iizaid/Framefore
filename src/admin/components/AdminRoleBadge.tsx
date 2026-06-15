import type { AdminRole } from "@/admin/types";
import { cn } from "@/lib/utils";

type AdminRoleBadgeProps = {
  role: AdminRole;
};

const ROLE_LABELS: Record<AdminRole, string> = {
  owner: "Owner",
  admin: "Admin",
  support: "Support",
  reviewer: "Reviewer",
};

export function AdminRoleBadge({ role }: AdminRoleBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]",
        role === "owner" && "bg-[var(--color-midnight)] text-white",
        role === "admin" && "border border-[var(--color-midnight)] text-[var(--color-ink)]",
        role === "support" && "bg-[var(--color-stone-surface)] text-[var(--color-ink)]",
        role === "reviewer" && "border border-[var(--color-border-strong)] text-[var(--color-ink-soft)]"
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}
