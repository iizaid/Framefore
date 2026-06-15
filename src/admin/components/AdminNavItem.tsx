import type { LucideIcon } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

type AdminNavItemProps = {
  icon: LucideIcon;
  label: string;
  /** When set, the item renders as a real navigation link. Omit for planned/disabled items. */
  to?: string;
  /** Match the route exactly (use for parent routes like /admin so children don't keep it active). */
  end?: boolean;
  status?: string;
};

const BASE_CLASS = "flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[13px]";

export function AdminNavItem({ icon: Icon, label, to, end = false, status = "Planned" }: AdminNavItemProps) {
  // Planned modules render as a non-interactive, clearly disabled row.
  if (!to) {
    return (
      <div
        aria-disabled
        className={cn(BASE_CLASS, "border-transparent text-[#8a8983]")}
      >
        <Icon size={14} className="shrink-0 text-[#8a8983]" />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span className="shrink-0 rounded-full border border-[#d8d6cf] bg-[#f7f7f5] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#77756f]">
          {status}
        </span>
      </div>
    );
  }

  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          BASE_CLASS,
          isActive
            ? "border-[#e1ded6] bg-white text-[#111111] shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            : "border-transparent text-[#4f4e49] hover:bg-white/70 hover:text-[#111111]",
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={14} className="shrink-0" />
          <span className="min-w-0 flex-1 truncate" aria-current={isActive ? "page" : undefined}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}
