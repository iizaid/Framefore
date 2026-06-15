import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type AdminNavItemProps = {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  status?: string;
};

export function AdminNavItem({ icon: Icon, label, active = false, status = "Planned" }: AdminNavItemProps) {
  return (
    <div
      aria-current={active ? "page" : undefined}
      aria-disabled={!active}
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm",
        active
          ? "border-[var(--color-midnight)] bg-[var(--color-midnight)] text-white"
          : "border-transparent text-[var(--color-ink-soft)] opacity-80"
      )}
    >
      <Icon size={15} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {!active && (
        <span className="shrink-0 rounded-full border border-[var(--color-border-strong)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">
          {status}
        </span>
      )}
    </div>
  );
}
