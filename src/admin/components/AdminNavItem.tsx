import type { LucideIcon } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

type AdminNavItemProps = {
  icon: LucideIcon;
  label: string;
  to?: string;
  end?: boolean;
  collapsed?: boolean;
};

const BASE_CLASS =
  "relative flex min-w-0 items-center rounded-lg px-2.5 py-2 text-[13px] transition-colors";

export function AdminNavItem({ icon: Icon, label, to, end = false, collapsed = false }: AdminNavItemProps) {
  const iconOnly = collapsed;

  if (!to) {
    return (
      <div
        aria-disabled
        title={collapsed ? label : undefined}
        className={cn(
          BASE_CLASS,
          "text-white/30 cursor-default",
          iconOnly ? "justify-center" : "gap-2.5"
        )}
      >
        <Icon size={15} className="shrink-0" />
        {!iconOnly && (
          <>
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.15em] text-[#6b7280]">
              Soon
            </span>
          </>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          BASE_CLASS,
          iconOnly ? "justify-center" : "gap-2.5",
          isActive
            ? "bg-[#1a1a1a] font-medium text-white shadow-sm ring-1 ring-white/10 before:absolute before:left-0 before:top-1/2 before:h-4 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-white"
            : "text-[#9ca3af] hover:bg-white/[0.04] hover:text-white"
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={15} className="shrink-0" />
          {!iconOnly && (
            <span className="min-w-0 flex-1 truncate" aria-current={isActive ? "page" : undefined}>
              {label}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}
