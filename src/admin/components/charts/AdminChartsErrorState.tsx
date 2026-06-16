import { AlertCircle } from "lucide-react";

export function AdminChartsErrorState({ error, unavailable }: { error: string; unavailable?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] py-16 text-center shadow-[var(--ff-shadow-card)]">
      <AlertCircle className="mb-4 h-8 w-8 text-[var(--ff-violet)]" />
      <h3 className="text-sm font-semibold text-[var(--ff-ink)]">
        {unavailable ? "Charts Unavailable" : "Failed to load charts"}
      </h3>
      <p className="mt-1 max-w-[400px] text-sm text-[var(--color-ink-soft)]">
        {error}
      </p>
      {unavailable && (
        <p className="mt-4 text-xs font-medium text-[var(--ff-violet)]">
          Please run migration 0012 to enable the charting API.
        </p>
      )}
    </div>
  );
}
