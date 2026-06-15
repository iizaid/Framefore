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
        "inline-flex items-center text-[10px] font-semibold uppercase tracking-[0.1em]",
        role === "owner" && "text-[#111111]",
        role === "admin" && "text-[#333333]",
        role === "support" && "text-[#55514c]",
        role === "reviewer" && "text-[#77736d]"
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}
