import { ArrowLeft, Menu } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAdminRoleStore } from "@/admin/store/useAdminRoleStore";
import { useAdminOverviewStore } from "@/admin/store/useAdminOverviewStore";

interface AdminTopbarProps {
  onOpenSidebar: () => void;
}

const SECTION_TITLES: Record<string, string> = {
  "/admin/users": "Users",
  "/admin": "Overview",
};

export function AdminTopbar({ onOpenSidebar }: AdminTopbarProps) {
  const location = useLocation();
  const roles = useAdminRoleStore((s) => s.roles);
  const loading = useAdminOverviewStore((s) => s.loading);

  const sectionTitle =
    SECTION_TITLES[location.pathname] ??
    Object.entries(SECTION_TITLES).find(([path]) => location.pathname.startsWith(path))?.[1] ??
    "Admin";

  // Highest role to show
  const topRole = roles[0];

  return (
    <header className="sticky top-0 z-20 flex h-[60px] items-center gap-3 border-b border-[var(--color-border)] bg-white/88 px-4 backdrop-blur-sm sm:px-6">
      {/* Mobile hamburger */}
      <button
        onClick={onOpenSidebar}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[var(--color-ink-faint)] hover:bg-[var(--color-surface-2)] lg:hidden"
        aria-label="Open navigation"
      >
        <Menu size={18} />
      </button>

      {/* Breadcrumb */}
      <div className="min-w-0 flex-1">
        <span className="text-xs text-[var(--color-ink-faint)]">Admin</span>
        <span className="mx-1.5 text-xs text-[var(--color-border-strong)]">/</span>
        <span className="text-xs font-medium text-[var(--color-ink-soft)]">{sectionTitle}</span>
      </div>

      {/* Right actions */}
      <div className="flex shrink-0 items-center gap-2">
        {/* Role pill — only on larger screens */}
        {topRole && (
          <span className="hidden items-center rounded-full bg-[var(--ff-blue-chalk)] px-2.5 py-1 text-[11px] font-semibold uppercase text-[var(--ff-haiti)] ring-1 ring-inset ring-[var(--color-border)] sm:flex">
            {topRole}
          </span>
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--ff-violet)]" />
        )}

        {/* Back to app */}
        <Link
          to="/app"
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--ff-carbon)] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--ff-haiti)]"
        >
          <ArrowLeft size={13} />
          <span>Back to app</span>
        </Link>
      </div>
    </header>
  );
}
