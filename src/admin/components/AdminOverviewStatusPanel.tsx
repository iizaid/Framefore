import { Database, ShieldCheck } from "lucide-react";
import type { AdminOverviewMetrics } from "@/admin/types";

type AdminOverviewStatusPanelProps = {
  metrics: AdminOverviewMetrics;
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function AdminOverviewStatusPanel({ metrics }: AdminOverviewStatusPanelProps) {
  return (
    <section className="grid gap-3">
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--ff-shadow-card)]">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-[var(--ff-violet)]" />
          <h2 className="text-base font-semibold text-[var(--ff-ink)]">Aggregate-only contract</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--color-ink-soft)]">
          Metrics are aggregate-only and do not expose user rows, emails, avatar
          paths, creative content, event metadata, or storage object paths.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--color-ink-soft)]">
          <span className="rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1">
            Generated: {formatDateTime(metrics.generatedAt)}
          </span>
          <span className="rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1">
            Source: {metrics.sourceVersion}
          </span>
        </div>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--ff-shadow-card)]">
        <div className="flex items-center gap-2">
          <Database size={16} className="text-[var(--ff-violet)]" />
          <h2 className="text-base font-semibold text-[var(--ff-ink)]">Cloud row boundary</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--color-ink-soft)]">
          Cloud sync is not enabled. Project counts below reflect database rows
          only, not local projects stored in the browser.
        </p>
        <div className="mt-3 w-fit rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1 text-xs text-[var(--color-ink-soft)]">
          cloudSyncEnabled: {metrics.cloudSyncEnabled ? "true" : "false"}
        </div>
      </div>
    </section>
  );
}
