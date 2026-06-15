import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AdminMetricCardProps = {
  label: string;
  value: number | string | null;
  helperText?: string;
  statusLabel?: string;
  secondaryValue?: string;
  unavailable?: boolean;
  unavailableLabel?: string;
};

const numberFormatter = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });

function renderValue(value: number | string | null, unavailable: boolean, unavailableLabel: string): ReactNode {
  if (unavailable || value == null) return unavailableLabel;
  if (typeof value === "number") return numberFormatter.format(value);
  return value;
}

export function AdminMetricCard({
  label,
  value,
  helperText,
  statusLabel,
  secondaryValue,
  unavailable = false,
  unavailableLabel = "Unavailable",
}: AdminMetricCardProps) {
  const isUnavailable = unavailable || value == null;

  return (
    <article
      className={cn(
        "rounded-[var(--radius-card)] border bg-[var(--color-surface)] p-4",
        isUnavailable ? "border-dashed border-[var(--color-border-strong)] opacity-80" : "border-[var(--color-border-strong)]"
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-soft)]">{label}</p>
        {statusLabel && (
          <span className="shrink-0 rounded-full border border-[var(--color-border-strong)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">
            {statusLabel}
          </span>
        )}
      </div>
      <div
        className={cn(
          "mt-3 font-display text-3xl leading-none",
          isUnavailable ? "text-[var(--color-ink-soft)]" : "text-[var(--color-charcoal)]"
        )}
      >
        {renderValue(value, isUnavailable, unavailableLabel)}
      </div>
      {secondaryValue && <p className="mt-2 text-sm font-medium text-[var(--color-ink)]">{secondaryValue}</p>}
      {helperText && <p className="mt-2 text-xs leading-5 text-[var(--color-ink-soft)]">{helperText}</p>}
    </article>
  );
}
