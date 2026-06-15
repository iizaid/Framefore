import { useEffect, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { AdminLayout } from "@/admin/components/AdminLayout";
import { AdminOverviewErrorState } from "@/admin/components/AdminOverviewErrorState";
import { AdminOverviewSkeleton } from "@/admin/components/AdminOverviewSkeleton";
import { AdminOverviewStatusPanel } from "@/admin/components/AdminOverviewStatusPanel";
import { useAdminOverviewStore } from "@/admin/store/useAdminOverviewStore";

const numberFormatter = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });

function formatDateTime(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatMetric(value: number | string | null) {
  if (value == null) return "Deferred";
  return typeof value === "number" ? numberFormatter.format(value) : value;
}

function SummaryItem({ label, value, helper }: { label: string; value: number | string | null; helper: string }) {
  return (
    <div className="min-w-0 px-4 py-3">
      <p className="text-xs font-medium text-[#6b6b66]">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-[#111111]">{formatMetric(value)}</p>
      <p className="mt-1 truncate text-xs text-[#6b6b66]">{helper}</p>
    </div>
  );
}

function Panel({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#deded8] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="border-b border-[#e4e3dd] px-4 py-3">
        <h3 className="text-sm font-semibold text-[#111111]">{title}</h3>
        {description && <p className="mt-0.5 text-xs leading-5 text-[#6b6b66]">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function CompactMetric({
  label,
  value,
  helper,
  badge,
}: {
  label: string;
  value: number | string | null;
  helper?: string;
  badge?: string;
}) {
  return (
    <div className="min-w-0 border-b border-[#eeece7] px-4 py-3 last:border-b-0">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[#6b6b66]">{label}</p>
          <p className="mt-1 text-lg font-semibold tracking-tight text-[#111111]">{formatMetric(value)}</p>
          {helper && <p className="mt-1 text-xs leading-5 text-[#6b6b66]">{helper}</p>}
        </div>
        {badge && (
          <span className="shrink-0 rounded-full border border-[#dedbd3] bg-[#f7f7f5] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6b6b66]">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

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
  const completionRate =
    data && data.profiles.total > 0 ? `${Math.round((data.profiles.completed / data.profiles.total) * 100)}%` : null;
  const formattedLastLoadedAt = formatDateTime(lastLoadedAt);

  return (
    <AdminLayout>
      <div className="space-y-4">
        <section className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold tracking-tight text-[#111111]">Overview</h2>
            <p className="mt-1 text-sm leading-6 text-[#6b6b66]">
              Aggregate operational metrics from admin-only RPCs.
              {formattedLastLoadedAt ? ` Last updated: ${formattedLastLoadedAt}.` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="inline-flex w-fit items-center justify-center gap-1.5 rounded-lg bg-[#111111] px-3 py-2 text-sm font-medium text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : undefined} />
            Refresh
          </button>
        </section>

        {showSkeleton && <AdminOverviewSkeleton />}

        {!showSkeleton && !data && (
          <AdminOverviewErrorState error={error} unavailable={unavailable} loading={loading} onRetry={() => void refresh()} />
        )}

        {data && (
          <div className="space-y-4">
            {error && (
              <AdminOverviewErrorState error={error} unavailable={unavailable} loading={loading} onRetry={() => void refresh()} />
            )}

            <section className="grid overflow-hidden rounded-2xl border border-[#deded8] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:grid-cols-2 xl:grid-cols-4">
              <SummaryItem label="Total users" value={data.users.total} helper="Aggregate auth count" />
              <div className="border-t border-[#e4e3dd] sm:border-l sm:border-t-0">
                <SummaryItem label="New users 7d" value={data.users.new7d} helper="Accounts created recently" />
              </div>
              <div className="border-t border-[#e4e3dd] xl:border-l xl:border-t-0">
                <SummaryItem label="Completed profiles" value={data.profiles.completed} helper="Profiles marked complete" />
              </div>
              <div className="border-t border-[#e4e3dd] sm:border-l xl:border-t-0">
                <SummaryItem label="Admin audit 24h" value={data.events.adminAudit24h} helper="Privileged action count" />
              </div>
            </section>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="grid gap-4 lg:grid-cols-3">
                <Panel title="Platform" description="User growth from aggregate auth counts only.">
                  <CompactMetric label="Total users" value={data.users.total} />
                  <CompactMetric label="New users - 7 days" value={data.users.new7d} />
                  <CompactMetric label="New users - 30 days" value={data.users.new30d} />
                </Panel>

                <Panel title="Profiles" description="Profile totals without exposing profile rows.">
                  <CompactMetric label="Total profiles" value={data.profiles.total} />
                  <CompactMetric label="Completed profiles" value={data.profiles.completed} />
                  <CompactMetric label="Uploaded avatars" value={data.profiles.withUploadedAvatar} helper="Count only; no avatar paths." />
                  <CompactMetric
                    label="Completion rate"
                    value={data.profiles.total === 0 ? null : completionRate}
                    helper={data.profiles.total > 0 ? `${data.profiles.completed} of ${data.profiles.total}` : "No profiles yet"}
                  />
                </Panel>

                <Panel title="Roles" description="Support/reviewer roles remain forbidden from console access in MVP.">
                  <CompactMetric label="Owners" value={data.roles.owners} />
                  <CompactMetric label="Admins" value={data.roles.admins} />
                  <CompactMetric label="Support" value={data.roles.support} />
                  <CompactMetric label="Reviewers" value={data.roles.reviewers} />
                </Panel>
              </div>

              <AdminOverviewStatusPanel metrics={data} />
            </div>

            <Panel title="Events" description="Counts only. Event rows, metadata, IP hashes, and details are not rendered.">
              <div className="grid sm:grid-cols-2 xl:grid-cols-6">
                <CompactMetric label="Admin audit - 24h" value={data.events.adminAudit24h} />
                <CompactMetric label="Admin audit - 7d" value={data.events.adminAudit7d} />
                <CompactMetric label="Security - 24h" value={data.events.security24h} />
                <CompactMetric label="Security - 7d" value={data.events.security7d} />
                <CompactMetric label="Rate-limit - 24h" value={data.events.rateLimit24h} />
                <CompactMetric label="Rate-limit - 7d" value={data.events.rateLimit7d} />
              </div>
            </Panel>

            <div className="grid gap-4 xl:grid-cols-2">
              <Panel
                title="Cloud database rows"
                description="Database rows only. Local browser projects are not counted."
              >
                <CompactMetric label="Cloud project rows" value={data.cloudRows.projects} />
                <CompactMetric label="Cloud scene rows" value={data.cloudRows.scenes} />
                <CompactMetric label="Cloud scene asset rows" value={data.cloudRows.sceneAssets} />
              </Panel>

              <Panel title="Storage" description="Object counts are deferred until storage moderation is designed.">
                <CompactMetric label="Avatar objects" value={data.storage.avatars} badge="Deferred" />
                <CompactMetric label="Reference image objects" value={data.storage.referenceImages} badge="Deferred" />
              </Panel>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
