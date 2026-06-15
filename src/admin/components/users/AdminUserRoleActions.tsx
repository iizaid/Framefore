import { useState } from "react";
import { Shield } from "lucide-react";
import { AdminRoleActionDialog } from "./AdminRoleActionDialog";
import type { AdminRole } from "@/admin/types";

type AdminUserRoleActionsProps = {
  userId: string;
  email: string | null;
  displayName: string | null;
  currentRoles: AdminRole[];
};

export function AdminUserRoleActions({
  userId,
  email,
  displayName,
  currentRoles,
}: AdminUserRoleActionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#e8e8ec] bg-white px-3 py-1.5 text-xs font-medium text-[#374151] shadow-sm hover:bg-[#f9fafb]"
      >
        <Shield size={14} className="text-[#9ca3af]" />
        Manage roles
      </button>

      <AdminRoleActionDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        userId={userId}
        email={email}
        displayName={displayName}
        currentRoles={currentRoles}
      />
    </>
  );
}
