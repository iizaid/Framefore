import { type ReactNode } from "react";

type AdminChartShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
};

export function AdminChartShell({ title, subtitle, children, action }: AdminChartShellProps) {
  return (
    <div className="flex flex-col">
      <div className="mb-3 flex items-start justify-between px-1">
        <div>
          <h3 className="text-sm font-semibold text-[var(--ff-ink)]">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-[var(--color-ink-faint)]">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--ff-shadow-card)]">
        {children}
      </div>
    </div>
  );
}
