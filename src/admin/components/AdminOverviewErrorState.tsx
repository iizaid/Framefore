import { AlertTriangle, RefreshCw } from "lucide-react";

type AdminOverviewErrorStateProps = {
  error: string | null;
  unavailable?: boolean;
  loading?: boolean;
  onRetry: () => void;
};

export function AdminOverviewErrorState({ error, unavailable = false, loading = false, onRetry }: AdminOverviewErrorStateProps) {
  const shouldMentionMigration = unavailable && /migration|not available/i.test(error ?? "");
  const message = shouldMentionMigration
    ? "Overview metrics are unavailable. Apply the latest Supabase migration and try again."
    : error ?? "Overview metrics could not be loaded. Please try again.";

  return (
    <section className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--color-stone-surface)] text-[var(--color-ink)]">
            <AlertTriangle size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-lg text-[var(--color-charcoal)]">Overview metrics unavailable</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-ink-soft)]">{message}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRetry}
          disabled={loading}
          className="inline-flex w-fit items-center justify-center gap-1.5 rounded-lg bg-[var(--color-midnight)] px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : undefined} />
          Retry
        </button>
      </div>
    </section>
  );
}
