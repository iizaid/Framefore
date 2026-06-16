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
        "inline-flex items-center font-mono-ui text-[10px] font-semibold uppercase",
        role === "owner" && "text-[var(--ff-ink)]",
        role === "admin" && "text-[var(--ff-violet)]",
        role === "support" && "text-[var(--color-ink-soft)]",
        role === "reviewer" && "text-[var(--color-ink-faint)]"
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}
