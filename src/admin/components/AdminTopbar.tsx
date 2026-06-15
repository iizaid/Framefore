import { ArrowLeft, ShieldCheck, UserRound } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { AdminRoleBadge } from "@/admin/components/AdminRoleBadge";
import { useAdminRoleStore } from "@/admin/store/useAdminRoleStore";

export function AdminTopbar() {
  const location = useLocation();
  const roles = useAdminRoleStore((s) => s.roles);
  const sectionTitle = location.pathname.startsWith("/admin/users") ? "Users" : "Overview";

  return (
    <header className="sticky top-0 z-20 border-b border-[#deded8] bg-white px-4 py-2.5 sm:px-5 lg:px-6">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="text-xs font-medium text-[#6b6b66]">Admin / {sectionTitle}</p>
            <h1 className="text-base font-semibold tracking-tight text-[#111111]">Admin console</h1>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between lg:justify-end">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e1ded6] bg-[#f7f7f5] px-2 py-0.5 text-[11px] font-medium text-[#333333]">
              <ShieldCheck size={13} />
              MVP access
            </span>
            {roles.length > 0 ? (
              roles.map((role) => <AdminRoleBadge key={role} role={role} />)
            ) : (
              <span className="rounded-full border border-[#e1ded6] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b6b66]">
                Roles verified
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/app"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#111111] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-black"
            >
              <ArrowLeft size={15} />
              Back to app
            </Link>
            <Link
              to="/profile"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#dedbd3] bg-white px-2.5 py-1.5 text-xs font-medium text-[#333333] hover:bg-[#f7f7f5]"
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
