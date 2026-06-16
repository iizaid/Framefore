import { AdminRoleBadge } from "@/admin/components/AdminRoleBadge";
import type { AdminRole } from "@/admin/types";

type AdminUserRoleBadgesProps = {
  roles: AdminRole[];
};

export function AdminUserRoleBadges({ roles }: AdminUserRoleBadgesProps) {
  if (roles.length === 0) {
    return <span className="text-xs text-[var(--color-ink-soft)]">No roles</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {roles.map((role) => (
        <AdminRoleBadge key={role} role={role} />
      ))}
    </div>
  );
}
