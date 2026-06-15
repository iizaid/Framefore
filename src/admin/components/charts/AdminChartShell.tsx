import { type ReactNode } from "react";

type AdminChartShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
};

export function AdminChartShell({ title, subtitle, children, action }: AdminChartShellProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-[#e8e8ec] bg-white shadow-sm">
      <div className="flex items-start justify-between border-b border-[#f3f4f6] px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-[#111111]">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-[#9ca3af]">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="flex-1 p-5">
        {children}
      </div>
    </div>
  );
}
