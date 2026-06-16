import { AdminChartShell } from "./AdminChartShell";

export function AdminChartsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AdminChartShell title="User Growth" subtitle="Loading metrics...">
          <div className="h-[200px] w-full animate-pulse rounded-[var(--radius-card)] bg-[var(--color-surface-2)]" />
        </AdminChartShell>
        <AdminChartShell title="Profiles Created" subtitle="Loading metrics...">
          <div className="h-[200px] w-full animate-pulse rounded-[var(--radius-card)] bg-[var(--color-surface-2)]" />
        </AdminChartShell>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <AdminChartShell title="Security Events">
          <div className="h-[150px] w-full animate-pulse rounded-[var(--radius-card)] bg-[var(--color-surface-2)]" />
        </AdminChartShell>
        <AdminChartShell title="Audit Events">
          <div className="h-[150px] w-full animate-pulse rounded-[var(--radius-card)] bg-[var(--color-surface-2)]" />
        </AdminChartShell>
        <AdminChartShell title="Rate Limit Triggers">
          <div className="h-[150px] w-full animate-pulse rounded-[var(--radius-card)] bg-[var(--color-surface-2)]" />
        </AdminChartShell>
      </div>
    </div>
  );
}
