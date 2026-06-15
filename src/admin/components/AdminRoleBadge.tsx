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
        "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]",
        role === "owner" && "bg-[#111111] text-white",
        role === "admin" && "border border-[#111111] bg-white text-[#333333]",
        role === "support" && "bg-[#f1f1ef] text-[#333333]",
        role === "reviewer" && "border border-[#dedbd3] text-[#6b6b66]"
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}
