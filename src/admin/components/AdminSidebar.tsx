import {
  Activity,
  Archive,
  ClipboardList,
  Gauge,
  HardDrive,
  LayoutDashboard,
  LockKeyhole,
  Settings,
  ShieldAlert,
  UserCog,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AdminNavItem } from "@/admin/components/AdminNavItem";

type AdminSidebarItem = {
  label: string;
  icon: LucideIcon;
  /** Real link target. Omit for planned/disabled modules. */
  to?: string;
  /** Exact-match the route (used for /admin so it isn't active on /admin/users). */
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
    title: "Trust and safety",
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

export function AdminSidebar() {
  return (
    <aside className="border-b border-[#e6e4de] bg-[#f1f1ef] lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r">
      <div className="flex h-full flex-col gap-6 px-4 py-4 lg:px-5 lg:py-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#111111] text-white">
              <Gauge size={17} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold tracking-tight text-[#111111]">Framefore Admin</p>
              <p className="text-xs text-[#6b6b66]">Operations console</p>
            </div>
          </div>
        </div>

        <nav className="flex min-w-0 gap-4 overflow-x-auto pb-1 lg:flex-col lg:gap-5 lg:overflow-visible lg:pb-0">
          {NAV_GROUPS.map((group) => (
            <section key={group.title} className="min-w-[250px] lg:min-w-0">
              <h2 className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#77756f]">
                {group.title}
              </h2>
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <AdminNavItem key={item.label} icon={item.icon} label={item.label} to={item.to} end={item.end} />
                ))}
              </div>
            </section>
          ))}
        </nav>

        <div className="mt-auto hidden rounded-2xl border border-dashed border-[#d8d5cc] bg-white/55 p-3 text-xs leading-5 text-[#6b6b66] lg:block">
          Future modules are intentionally disabled until their data producers and
          server-side checks exist.
        </div>
      </div>
    </aside>
  );
}
