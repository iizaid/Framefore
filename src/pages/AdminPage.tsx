import { useEffect } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { AdminLayout } from "@/admin/components/AdminLayout";
import { AdminMetricCard } from "@/admin/components/AdminMetricCard";
import { AdminMetricGrid } from "@/admin/components/AdminMetricGrid";
import { AdminOverviewErrorState } from "@/admin/components/AdminOverviewErrorState";
import { AdminOverviewSkeleton } from "@/admin/components/AdminOverviewSkeleton";
import { AdminOverviewStatusPanel } from "@/admin/components/AdminOverviewStatusPanel";
import { AdminShellEmptyState } from "@/admin/components/AdminShellEmptyState";
import { useAdminOverviewStore } from "@/admin/store/useAdminOverviewStore";

const PLANNED_MODULES = [
  "Users - planned",
  "Roles - planned",
  "Audit log table - planned",
  "Security events table - planned",
  "Storage moderation - planned",
  "System health - planned",
];

const GUARDRAILS = [
  "No fake metrics, charts, users, or audit rows.",
  "All visible numbers come from admin_get_overview_metrics().",
  "No direct browser reads from auth.users or admin tables.",
  "No service-role key in the browser.",
  "/app remains local-first.",
  "Cloud sync is not implemented.",
];

function formatDateTime(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
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
      <div className="space-y-6">
        <section className="rounded-[var(--radius-card)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-soft)]">
                Real aggregate overview
              </p>
              <h2 className="mt-2 font-display text-2xl text-[var(--color-charcoal)]">Admin overview</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-ink-soft)]">
                Metrics are loaded from the admin-only aggregate RPC. No user
                rows, creative content, event details, or storage paths are shown.
              </p>
              {formattedLastLoadedAt && (
                <p className="mt-2 text-xs text-[var(--color-ink-soft)]">Last updated: {formattedLastLoadedAt}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className="inline-flex w-fit items-center justify-center gap-1.5 rounded-lg bg-[var(--color-midnight)] px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : undefined} />
              Refresh
            </button>
          </div>
        </section>

        {showSkeleton && <AdminOverviewSkeleton />}

        {!showSkeleton && !data && (
          <AdminOverviewErrorState error={error} unavailable={unavailable} loading={loading} onRetry={() => void refresh()} />
        )}

        {data && (
          <div className="space-y-6">
            {error && (
              <AdminOverviewErrorState error={error} unavailable={unavailable} loading={loading} onRetry={() => void refresh()} />
            )}

            <AdminOverviewStatusPanel metrics={data} />

            <AdminMetricGrid title="Platform" description="Aggregate user counts from the admin-only RPC.">
              <AdminMetricCard label="Total users" value={data.users.total} helperText="Aggregate auth user count only." />
              <AdminMetricCard label="New users - 7 days" value={data.users.new7d} helperText="Accounts created in the last 7 days." />
              <AdminMetricCard label="New users - 30 days" value={data.users.new30d} helperText="Accounts created in the last 30 days." />
            </AdminMetricGrid>

            <AdminMetricGrid title="Profiles" description="Profile counts are aggregate-only; no profile rows are exposed.">
              <AdminMetricCard label="Total profiles" value={data.profiles.total} helperText="Rows in profiles." />
              <AdminMetricCard label="Completed profiles" value={data.profiles.completed} helperText="Profiles marked complete." />
              <AdminMetricCard label="Uploaded avatars" value={data.profiles.withUploadedAvatar} helperText="Profiles with an uploaded avatar path, counted only." />
              <AdminMetricCard
                label="Profile completion rate"
                value={completionRate}
                helperText="Computed from completed profiles divided by total profiles."
                secondaryValue={data.profiles.total > 0 ? `${data.profiles.completed} of ${data.profiles.total}` : undefined}
                unavailable={data.profiles.total === 0}
                unavailableLabel="No profiles yet"
              />
            </AdminMetricGrid>

            <AdminMetricGrid title="Roles" description="Support and reviewer roles exist, but they remain forbidden from the Admin Console in MVP.">
              <AdminMetricCard label="Owners" value={data.roles.owners} helperText="Owner role rows." />
              <AdminMetricCard label="Admins" value={data.roles.admins} helperText="Admin role rows." />
              <AdminMetricCard label="Support" value={data.roles.support} helperText="Future staff role. Forbidden in MVP." />
              <AdminMetricCard label="Reviewers" value={data.roles.reviewers} helperText="Future review role. Forbidden in MVP." />
            </AdminMetricGrid>

            <AdminMetricGrid title="Events" description="Counts only. Event rows, metadata, IP hashes, and details are not rendered.">
              <AdminMetricCard label="Admin audit - 24h" value={data.events.adminAudit24h} helperText="Privileged action audit count." />
              <AdminMetricCard label="Admin audit - 7d" value={data.events.adminAudit7d} helperText="Privileged action audit count." />
              <AdminMetricCard label="Security events - 24h" value={data.events.security24h} helperText="Aggregate security event count." />
              <AdminMetricCard label="Security events - 7d" value={data.events.security7d} helperText="Aggregate security event count." />
              <AdminMetricCard label="Rate-limit events - 24h" value={data.events.rateLimit24h} helperText="Aggregate custom rate-limit event count." />
              <AdminMetricCard label="Rate-limit events - 7d" value={data.events.rateLimit7d} helperText="Aggregate custom rate-limit event count." />
            </AdminMetricGrid>

            <AdminMetricGrid title="Cloud database rows" description="Database rows only. Local-first browser projects are not counted.">
              <AdminMetricCard label="Cloud project rows" value={data.cloudRows.projects} helperText="Database rows only, not total local projects." />
              <AdminMetricCard label="Cloud scene rows" value={data.cloudRows.scenes} helperText="Database rows only, not local IndexedDB scenes." />
              <AdminMetricCard label="Cloud scene asset rows" value={data.cloudRows.sceneAssets} helperText="Database rows only, not local image blobs." />
            </AdminMetricGrid>

            <AdminMetricGrid title="Storage" description="Storage object counts are deferred until the storage moderation path is designed.">
              <AdminMetricCard
                label="Avatar objects"
                value={data.storage.avatars}
                helperText="Bucket object counting is not connected in Phase E2."
                statusLabel="Deferred"
                unavailableLabel="Deferred"
              />
              <AdminMetricCard
                label="Reference image objects"
                value={data.storage.referenceImages}
                helperText="Reference-image object counting waits for cloud sync/storage moderation."
                statusLabel="Deferred"
                unavailableLabel="Deferred"
              />
            </AdminMetricGrid>

            <AdminShellEmptyState
              title="Future admin modules remain planned"
              description="The Overview now uses real aggregate metrics. Other modules stay disabled until their secure data producers and UI contracts exist."
              statusLabel="Planned"
              bullets={PLANNED_MODULES}
            />

            <AdminShellEmptyState
              title="Production guardrails"
              description="The dashboard stays intentionally narrow until privileged data access is designed and audited."
              statusLabel="Active"
              bullets={GUARDRAILS}
            />

            <section className="rounded-[var(--radius-card)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--color-midnight)] text-white">
                  <ShieldCheck size={16} />
                </span>
                <div>
                  <h2 className="font-display text-base text-[var(--color-charcoal)]">AdminGuard remains the gate</h2>
                  <p className="mt-1 text-sm leading-6 text-[var(--color-ink-soft)]">
                    Non-admin, support, and reviewer accounts are stopped before
                    this overview store loads. Owner/admin access is still the
                    only MVP path into the shell.
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
