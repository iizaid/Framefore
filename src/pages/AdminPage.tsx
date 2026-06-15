import { useEffect } from "react";
import {
  RefreshCw,
  Users,
  UserCheck,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { AdminLayout } from "@/admin/components/AdminLayout";
import { AdminOverviewErrorState } from "@/admin/components/AdminOverviewErrorState";
import { AdminOverviewSkeleton } from "@/admin/components/AdminOverviewSkeleton";
import { useAdminOverviewStore } from "@/admin/store/useAdminOverviewStore";
import type { AdminOverviewMetrics } from "@/admin/types";

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

// ─── Sparkline (SVG) ──────────────────────────────────────────────────────────
function Sparkline({ values, color = "#22c55e" }: { values: number[]; color?: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const w = 64, h = 28;
  const step = w / (values.length - 1);
  const pts = values
    .map((v, i) => `${i * step},${h - (v / max) * h}`)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Bar Chart (realistic) ───────────────────────────────────────────────────
function BarChart({
  data,
  color = "#6366f1",
}: {
  data: { label: string; value: number }[];
  color?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const W = 240, H = 80;
  const padTop = 12, padBottom = 20, padSide = 12;
  const chartH = H - padTop - padBottom;
  const barCount = data.length;
  const gap = 8;
  const barW = (W - padSide * 2 - gap * (barCount - 1)) / barCount;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" aria-hidden>
      {/* Horizontal grid lines */}
      {[0, 0.5, 1].map((frac) => {
        const y = padTop + chartH * (1 - frac);
        return (
          <line
            key={frac}
            x1={padSide}
            x2={W - padSide}
            y1={y}
            y2={y}
            stroke="#f3f4f6"
            strokeWidth="1"
          />
        );
      })}

      {data.map((d, i) => {
        const barH = Math.max((d.value / max) * chartH, d.value > 0 ? 4 : 0);
        const x = padSide + i * (barW + gap);
        const y = padTop + chartH - barH;

        return (
          <g key={d.label}>
            {/* Bar */}
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx="3"
              fill={color}
              opacity={0.8}
            />
            {/* Value label on top */}
            {d.value > 0 && (
              <text
                x={x + barW / 2}
                y={y - 3}
                textAnchor="middle"
                fontSize="9"
                fill="#374151"
                fontWeight="600"
              >
                {d.value}
              </text>
            )}
            {/* X-axis label */}
            <text
              x={x + barW / 2}
              y={H - 5}
              textAnchor="middle"
              fontSize="9"
              fill="#9ca3af"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ value, total, color = "#6366f1" }: { value: number; total: number; color?: string }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const filled = total > 0 ? (value / total) * circ : 0;
  return (
    <svg viewBox="0 0 72 72" className="h-16 w-16 -rotate-90" aria-hidden>
      <circle cx="36" cy="36" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────
function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  trend,
  sparkValues,
  iconColor = "bg-indigo-50 text-indigo-600",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  trend?: "up" | "down" | "flat";
  sparkValues?: number[];
  iconColor?: string;
}) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up" ? "text-emerald-500" : trend === "down" ? "text-red-400" : "text-gray-400";

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-[#e8e8ec] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${iconColor}`}>
          <Icon size={18} />
        </div>
        {sparkValues && sparkValues.length > 1 && (
          <Sparkline values={sparkValues} />
        )}
      </div>
      <div className="mt-4">
        <p className="text-[13px] font-medium text-[#6b7280]">{label}</p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-[#111111]">{value}</p>
        {sub && (
          <div className={`mt-1.5 flex items-center gap-1 text-xs font-medium ${trendColor}`}>
            {trend && <TrendIcon size={12} />}
            <span className="text-[#9ca3af]">{sub}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────
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
    <div className="rounded-2xl border border-[#e8e8ec] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-[#111111]">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-[#9ca3af]">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Row item inside a section card ──────────────────────────────────────────
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
    <div className="flex items-center justify-between border-b border-[#f3f4f6] py-2.5 last:border-b-0">
      <span className="text-sm text-[#374151]">{label}</span>
      <div className="flex items-center gap-2">
        {badge}
        <span className="text-sm font-semibold text-[#111111]">{value}</span>
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

// ─── Events Mini-chart Card ───────────────────────────────────────────────────
function EventsBarCard({
  title,
  data,
  color,
}: {
  title: string;
  data: { label: string; value: number }[];
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-[#e8e8ec] bg-white p-5 shadow-sm">
      <p className="mb-3 text-sm font-semibold text-[#111111]">{title}</p>
      <div className="h-24">
        <BarChart data={data} color={color} />
      </div>
    </div>
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
          <h1 className="text-xl font-bold text-[#111111]">Dashboard</h1>
          <p className="mt-0.5 text-sm text-[#9ca3af]">
            {lastLoadedAt
              ? `Last updated ${fmtDate(lastLoadedAt)}`
              : "Aggregate operational metrics"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#e8e8ec] bg-white px-4 py-2 text-sm font-medium text-[#374151] shadow-sm hover:bg-[#f9fafb] disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : undefined} />
          Refresh
        </button>
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

      {data && <DashboardContent data={data} completionRate={completionRate} error={error} unavailable={unavailable} loading={loading} onRetry={() => void refresh()} />}
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
}: {
  data: AdminOverviewMetrics;
  completionRate: number;
  error: string | null;
  unavailable: boolean;
  loading: boolean;
  onRetry: () => void;
}) {
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

      {/* ── Top metric cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Users}
          label="Total Users"
          value={n(data.users.total)}
          sub={`+${n(data.users.new7d)} last 7 days`}
          trend="up"
          sparkValues={[
            data.users.total - data.users.new30d,
            data.users.total - data.users.new7d,
            data.users.total,
          ]}
          iconColor="bg-indigo-50 text-indigo-600"
        />
        <MetricCard
          icon={TrendingUp}
          label="New Users (30d)"
          value={n(data.users.new30d)}
          sub="Recent sign-ups"
          trend="up"
          sparkValues={[0, data.users.new7d, data.users.new30d]}
          iconColor="bg-emerald-50 text-emerald-600"
        />
        <MetricCard
          icon={UserCheck}
          label="Completed Profiles"
          value={n(data.profiles.completed)}
          sub={`${completionRate}% completion rate`}
          trend={completionRate > 50 ? "up" : "flat"}
          iconColor="bg-sky-50 text-sky-600"
        />
        <MetricCard
          icon={Activity}
          label="Admin Events (24h)"
          value={n(data.events.adminAudit24h)}
          sub="Privileged actions"
          iconColor="bg-amber-50 text-amber-600"
        />
      </div>

      {/* ── Middle row: Profile completion donut + Users + Roles ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Profile completion */}
        <SectionCard title="Profile Completion" subtitle="Completion rate across all users">
          <div className="flex items-center gap-5">
            <div className="relative flex-shrink-0">
              <DonutChart value={data.profiles.completed} total={data.profiles.total} color="#6366f1" />
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-[#111111]">
                {completionRate}%
              </span>
            </div>
            <div className="min-w-0 space-y-2">
              <DataRow label="Total profiles" value={n(data.profiles.total)} />
              <DataRow label="Completed" value={n(data.profiles.completed)} />
              <DataRow label="With avatar" value={n(data.profiles.withUploadedAvatar)} />
            </div>
          </div>
        </SectionCard>

        {/* Users detail */}
        <SectionCard title="User Growth" subtitle="Sign-up windows">
          <div className="space-y-0">
            <DataRow label="Total users" value={n(data.users.total)} />
            <DataRow label="New (last 7 days)" value={n(data.users.new7d)} />
            <DataRow label="New (last 30 days)" value={n(data.users.new30d)} />
          </div>
          <div className="mt-4 h-12">
            <BarChart
              data={[
                { label: "30d ago", value: data.users.total - data.users.new30d },
                { label: "7d ago", value: data.users.total - data.users.new7d },
                { label: "Now", value: data.users.total },
              ]}
              color="#6366f1"
            />
          </div>
        </SectionCard>

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
      </div>

      {/* ── Event bar charts ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <EventsBarCard
          title="Admin Audit Events"
          data={[
            { label: "24h", value: data.events.adminAudit24h },
            { label: "7d", value: data.events.adminAudit7d },
          ]}
          color="#6366f1"
        />
        <EventsBarCard
          title="Security Events"
          data={[
            { label: "24h", value: data.events.security24h },
            { label: "7d", value: data.events.security7d },
          ]}
          color="#f59e0b"
        />
        <EventsBarCard
          title="Rate Limit Events"
          data={[
            { label: "24h", value: data.events.rateLimit24h },
            { label: "7d", value: data.events.rateLimit7d },
          ]}
          color="#ef4444"
        />
      </div>

      {/* ── Bottom row: Cloud rows + Storage ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
      <p className="text-xs text-[#9ca3af]">
        Metrics are aggregate-only. No user rows, emails, paths, or content are exposed. Cloud sync not enabled.
      </p>
    </div>
  );
}
