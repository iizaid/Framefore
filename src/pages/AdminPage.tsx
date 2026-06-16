import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/admin/components/AdminLayout";
import { AdminOverviewErrorState } from "@/admin/components/AdminOverviewErrorState";
import { AdminOverviewSkeleton } from "@/admin/components/AdminOverviewSkeleton";
import { useAdminOverviewStore } from "@/admin/store/useAdminOverviewStore";
import type { AdminOverviewMetrics } from "@/admin/types";
import { adminQueryKeys } from "@/admin/lib/queryKeys";
import { loadAdminOverviewChartSeries } from "@/admin/lib/charts";
import { AdminChartShell } from "@/admin/components/charts/AdminChartShell";
import { AdminAreaTrendChart } from "@/admin/components/charts/AdminAreaTrendChart";
import { AdminBarTrendChart } from "@/admin/components/charts/AdminBarTrendChart";
import { AdminChartsSkeleton } from "@/admin/components/charts/AdminChartsSkeleton";
import { AdminChartsErrorState } from "@/admin/components/charts/AdminChartsErrorState";
import { AdminChartRangeControl } from "@/admin/components/charts/AdminChartRangeControl";

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmt = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });
function n(v: number | string | null) {
  if (v == null) return "—";
  return typeof v === "number" ? fmt.format(v) : v;
}
function fmtDate(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);
}

// ─── Stat Item (replaces MetricCard) ──────────────────────────────────────────
function StatItem({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col px-4 py-4 sm:px-6">
      <p className="text-sm font-medium text-[var(--color-ink-faint)]">{label}</p>
      <p className="mt-1 text-3xl font-bold text-[var(--ff-ink)] tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-[var(--color-ink-faint)]">{sub}</p>}
    </div>
  );
}

// ─── Section Card (Simplified, flat) ─────────────────────────────────────────
function SectionCard({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <div className="mb-3 flex items-start justify-between px-1">
        <div>
          <h3 className="text-sm font-semibold text-[var(--ff-ink)]">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-[var(--color-ink-faint)]">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="rounded-xl border border-[var(--color-border)] bg-white">
        <div className="flex flex-col divide-y divide-[var(--color-border)] px-4 py-1">
          {children}
        </div>
      </div>
    </div>
  );
}

function DataRow({
  label,
  value,
  badge,
}: {
  label: string;
  value: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-2.5">
      <span className="min-w-0 text-sm text-[var(--color-ink-faint)]">{label}</span>
      <div className="flex shrink-0 items-center gap-2">
        {badge}
        <span className="min-w-[3rem] text-right text-sm font-semibold tabular-nums text-[var(--ff-ink)]">{value}</span>
      </div>
    </div>
  );
}

// ─── Role Badge ──────────────────────────────────────────────────────────────
function RolePill({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${color}`}>
      {label}
    </span>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export function AdminPage() {
  const data = useAdminOverviewStore((s) => s.data);
  const loading = useAdminOverviewStore((s) => s.loading);
  const initialized = useAdminOverviewStore((s) => s.initialized);
  const error = useAdminOverviewStore((s) => s.error);
  const unavailable = useAdminOverviewStore((s) => s.unavailable);
  const lastLoadedAt = useAdminOverviewStore((s) => s.lastLoadedAt);
  const loadOverview = useAdminOverviewStore((s) => s.loadOverview);
  const refresh = useAdminOverviewStore((s) => s.refresh);
  const reset = useAdminOverviewStore((s) => s.reset);

  const [chartDays, setChartDays] = useState<7 | 30 | 90>(30);

  useEffect(() => {
    void loadOverview();
    return () => reset();
  }, [loadOverview, reset]);

  const showSkeleton = !data && (!initialized || loading);
  const completionRate = data?.profiles.total
    ? Math.round((data.profiles.completed / data.profiles.total) * 100)
    : 0;

  return (
    <AdminLayout>
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--ff-ink)]">Dashboard</h1>
          <p className="mt-0.5 text-sm text-[var(--color-ink-faint)]">
            {lastLoadedAt
              ? `Last updated ${fmtDate(lastLoadedAt)}`
              : "Aggregate operational metrics"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <AdminChartRangeControl value={chartDays} onChange={setChartDays} />
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink-soft)] shadow-sm hover:bg-[var(--color-surface-2)] disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : undefined} />
            Refresh
          </button>
        </div>
      </div>

      {showSkeleton && <AdminOverviewSkeleton />}
      {!showSkeleton && !data && (
        <AdminOverviewErrorState
          error={error}
          unavailable={unavailable}
          loading={loading}
          onRetry={() => void refresh()}
        />
      )}

      {data && (
        <DashboardContent
          data={data}
          completionRate={completionRate}
          error={error}
          unavailable={unavailable}
          loading={loading}
          onRetry={() => void refresh()}
          chartDays={chartDays}
        />
      )}
    </AdminLayout>
  );
}

// ─── Dashboard content (rendered once data is available) ─────────────────────
function DashboardContent({
  data,
  completionRate,
  error,
  unavailable,
  loading,
  onRetry,
  chartDays,
}: {
  data: AdminOverviewMetrics;
  completionRate: number;
  error: string | null;
  unavailable: boolean;
  loading: boolean;
  onRetry: () => void;
  chartDays: 7 | 30 | 90;
}) {
  const { data: chartData, isLoading: isChartLoading, isError, error: queryError } = useQuery({
    queryKey: adminQueryKeys.charts.overviewSeries({ days: chartDays }),
    queryFn: () => loadAdminOverviewChartSeries({ days: chartDays }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return (
    <div className="space-y-6">
      {error && (
        <AdminOverviewErrorState
          error={error}
          unavailable={unavailable}
          loading={loading}
          onRetry={onRetry}
        />
      )}

      {/* ── Top metric summary strip ── */}
      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-[var(--ff-shadow-card)]">
        <div className="grid grid-cols-1 divide-y divide-[var(--color-border)] sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4 lg:divide-y-0">
          <StatItem
            label="Total Users"
            value={n(data.users.total)}
            sub={`+${n(data.users.new7d)} last 7 days`}
          />
          <StatItem
            label="New Users (30d)"
            value={n(data.users.new30d)}
            sub="Recent sign-ups"
          />
          <StatItem
            label="Completed Profiles"
            value={n(data.profiles.completed)}
            sub={`${completionRate}% completion rate`}
          />
          <StatItem
            label="Admin Events (24h)"
            value={n(data.events.adminAudit24h)}
            sub="Privileged actions"
          />
        </div>
      </div>

      {/* ── Charts Section ── */}
      {isChartLoading ? (
        <AdminChartsSkeleton />
      ) : isError || chartData?.error ? (
        <AdminChartsErrorState
          error={chartData?.error || (queryError as Error)?.message || "Failed to load chart series"}
          unavailable={chartData?.unavailable}
        />
      ) : chartData?.data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <AdminChartShell title="User Growth" subtitle={`New users created over the last ${chartDays} days`}>
              <AdminAreaTrendChart data={chartData.data.series.usersByDay} color="#6366f1" />
            </AdminChartShell>
            <AdminChartShell title="Profiles Created" subtitle={`New profiles created over the last ${chartDays} days`}>
              <AdminAreaTrendChart data={chartData.data.series.profilesByDay} color="#14b8a6" />
            </AdminChartShell>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <AdminChartShell title="Security Events" subtitle="Security log volume">
              <AdminBarTrendChart data={chartData.data.series.securityEventsByDay} color="#f59e0b" />
            </AdminChartShell>
            <AdminChartShell title="Admin Audit Events" subtitle="Privileged actions">
              <AdminBarTrendChart data={chartData.data.series.adminAuditByDay} color="#8b5cf6" />
            </AdminChartShell>
            <AdminChartShell title="Rate Limit Triggers" subtitle="Abuse/throttle events">
              <AdminBarTrendChart data={chartData.data.series.rateLimitEventsByDay} color="#ef4444" />
            </AdminChartShell>
          </div>
        </div>
      ) : null}

      {/* ── Bottom row: Roles + Cloud rows + Storage ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Roles */}
        <SectionCard title="Roles" subtitle="Role distribution">
          <div className="space-y-0">
            <DataRow
              label="Owners"
              value={n(data.roles.owners)}
              badge={<RolePill label="owner" color="bg-purple-100 text-purple-700" />}
            />
            <DataRow
              label="Admins"
              value={n(data.roles.admins)}
              badge={<RolePill label="admin" color="bg-indigo-100 text-indigo-700" />}
            />
            <DataRow
              label="Support"
              value={n(data.roles.support)}
              badge={<RolePill label="support" color="bg-sky-100 text-sky-700" />}
            />
            <DataRow
              label="Reviewers"
              value={n(data.roles.reviewers)}
              badge={<RolePill label="reviewer" color="bg-emerald-100 text-emerald-700" />}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Cloud Rows"
          subtitle="Database rows (local browser projects not counted)"
        >
          <DataRow label="Projects" value={n(data.cloudRows.projects)} />
          <DataRow label="Scenes" value={n(data.cloudRows.scenes)} />
          <DataRow label="Scene assets" value={n(data.cloudRows.sceneAssets)} />
        </SectionCard>

        <SectionCard
          title="Storage Objects"
          subtitle="Deferred until storage moderation is designed"
        >
          <DataRow label="Avatar objects" value={n(data.storage.avatars)} />
          <DataRow label="Reference image objects" value={n(data.storage.referenceImages)} />
        </SectionCard>
      </div>

      {/* Footer note */}
      <p className="text-xs text-[var(--color-ink-faint)]">
        Metrics are aggregate-only. No user rows, emails, paths, or content are exposed. Cloud sync not enabled.
      </p>
    </div>
  );
}
