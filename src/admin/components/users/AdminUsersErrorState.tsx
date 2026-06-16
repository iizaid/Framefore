import { AlertTriangle, RefreshCw } from "lucide-react";

type AdminUsersErrorStateProps = {
  error: string | null;
  unavailable?: boolean;
  loading?: boolean;
  onRetry: () => void;
};

export function AdminUsersErrorState({ error, unavailable = false, loading = false, onRetry }: AdminUsersErrorStateProps) {
  // Surface a migration hint only when the helper already flagged the RPC as
  // missing. We never render raw SQL/Zod errors to normal UI.
  const shouldMentionMigration = unavailable && /migration|not available/i.test(error ?? "");
  const message = shouldMentionMigration
    ? "Users list is unavailable. Apply the latest Supabase migrations and try again."
    : error ?? "The users list could not be loaded. Please try again.";

  return (
    <section className="border-y border-[var(--color-border)] bg-white p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius-button)] bg-[var(--ff-yellow-soft)] text-[var(--ff-haiti)]">
            <AlertTriangle size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-[var(--ff-ink)]">Users list unavailable</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-ink-soft)]">{message}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRetry}
          disabled={loading}
          className="inline-flex w-fit items-center justify-center gap-1.5 rounded-[var(--radius-button)] bg-[var(--ff-carbon)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--ff-haiti)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : undefined} />
          Retry
        </button>
      </div>
    </section>
  );
}
