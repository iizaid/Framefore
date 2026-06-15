import { ArrowLeft, ShieldCheck, UserRound } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { AdminRoleBadge } from "@/admin/components/AdminRoleBadge";
import { useAdminRoleStore } from "@/admin/store/useAdminRoleStore";

export function AdminTopbar() {
  const location = useLocation();
  const roles = useAdminRoleStore((s) => s.roles);
  const sectionTitle = location.pathname.startsWith("/admin/users") ? "Users" : "Overview";

  return (
    <header className="border-b border-[#e6e4de] bg-white px-4 py-3 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[#6b6b66]">Admin / {sectionTitle}</p>
          <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-[#111111]">Admin console</h1>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:justify-end">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e1ded6] bg-[#f7f7f5] px-2.5 py-1 text-xs font-medium text-[#333333]">
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
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#111111] px-3 py-2 text-sm font-medium text-white hover:bg-black"
            >
              <ArrowLeft size={15} />
              Back to app
            </Link>
            <Link
              to="/profile"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#dedbd3] bg-white px-3 py-2 text-sm font-medium text-[#333333] hover:bg-[#f7f7f5]"
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
