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

const BASE_CLASS = "flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm";

export function AdminNavItem({ icon: Icon, label, to, end = false, status = "Planned" }: AdminNavItemProps) {
  // Planned modules render as a non-interactive, clearly disabled row.
  if (!to) {
    return (
      <div
        aria-disabled
        className={cn(BASE_CLASS, "border-transparent text-[var(--color-ink-soft)] opacity-80")}
      >
        <Icon size={15} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span className="shrink-0 rounded-full border border-[var(--color-border-strong)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">
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
            ? "border-[var(--color-midnight)] bg-[var(--color-midnight)] text-white"
            : "border-transparent text-[var(--color-ink-soft)] hover:bg-[var(--color-stone-surface)] hover:text-[var(--color-ink)]",
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={15} className="shrink-0" />
          <span className="min-w-0 flex-1 truncate" aria-current={isActive ? "page" : undefined}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}
