import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { AdminRoleActionPopover } from "./AdminRoleActionPopover";
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
  const btnRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#e8e8ec] bg-white px-3 py-1.5 text-xs font-medium text-[#374151] shadow-sm hover:bg-[#f9fafb]"
      >
        Manage roles
        <ChevronDown
          size={12}
          className={`text-[#9ca3af] transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AdminRoleActionPopover
        anchorRef={btnRef}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        userId={userId}
        email={email}
        displayName={displayName}
        currentRoles={currentRoles}
      />
    </div>
  );
}
