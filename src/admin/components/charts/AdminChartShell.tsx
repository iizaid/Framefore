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
          <h3 className="text-sm font-semibold text-[#111111]">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-[#9ca3af]">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="rounded-xl border border-[#e8e8ec] bg-white p-4">
        {children}
      </div>
    </div>
  );
}
