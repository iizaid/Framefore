import {
  Activity,
  Archive,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  HardDrive,
  LayoutDashboard,
  LockKeyhole,
  Settings,
  ShieldAlert,
  UserCog,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AdminNavItem } from "@/admin/components/AdminNavItem";
import { cn } from "@/lib/utils";

type AdminSidebarItem = {
  label: string;
  icon: LucideIcon;
  to?: string;
  end?: boolean;
};

const NAV_GROUPS: Array<{ title: string; items: AdminSidebarItem[] }> = [
  {
    title: "Console",
    items: [{ label: "Overview", icon: LayoutDashboard, to: "/admin", end: true }],
  },
  {
    title: "People",
    items: [
      { label: "Users", icon: Users, to: "/admin/users" },
      { label: "Roles", icon: UserCog },
    ],
  },
  {
    title: "Trust & Safety",
    items: [
      { label: "Audit Logs", icon: ClipboardList },
      { label: "Security Events", icon: LockKeyhole },
      { label: "Abuse / Rate Limits", icon: ShieldAlert },
    ],
  },
  {
    title: "Infrastructure",
    items: [
      { label: "Storage", icon: HardDrive },
      { label: "Projects", icon: Archive },
      { label: "System Health", icon: Activity },
      { label: "Settings", icon: Settings },
    ],
  },
];

interface AdminSidebarProps {
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
}

export function AdminSidebar({ open, collapsed, onClose, onToggleCollapse }: AdminSidebarProps) {
  const width = collapsed ? "w-[68px]" : "w-[240px]";

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col bg-[var(--ff-haiti)] transition-all duration-300 lg:flex",
          "sticky top-0 h-screen overflow-hidden",
          width
        )}
      >
        <SidebarContent collapsed={collapsed} onToggleCollapse={onToggleCollapse} />
      </aside>

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[240px] flex-col bg-[var(--ff-haiti)] transition-transform duration-300 lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
        >
          <X size={16} />
        </button>
        <SidebarContent collapsed={false} onToggleCollapse={onToggleCollapse} />
      </aside>
    </>
  );
}

function SidebarContent({
  collapsed,
  onToggleCollapse,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Brand */}
      <div className={cn("flex h-[60px] items-center border-b border-white/[0.06] px-4", collapsed ? "justify-center" : "gap-3")}>
        <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-[var(--ff-haiti)]">
          <img
            src="/main logo white.svg"
            alt="Framefore logo"
            className="h-8 w-8 object-contain"
          />
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">Framefore</p>
            <p className="text-[10px] text-white/40">Admin Console</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="mb-4">
            {!collapsed && (
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase text-white/35">
                {group.title}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <AdminNavItem
                  key={item.label}
                  icon={item.icon}
                  label={item.label}
                  to={item.to}
                  end={item.end}
                  collapsed={collapsed}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse toggle — desktop only, icon only */}
      <div className="hidden border-t border-white/[0.06] px-2 py-3 lg:block">
        <button
          onClick={onToggleCollapse}
          className="flex h-9 w-full items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/80"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </div>
  );
}
