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
        "rounded-xl border bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]",
        isUnavailable ? "border-dashed border-[#dedbd3] opacity-80" : "border-[#e6e4de]"
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b6b66]">{label}</p>
        {statusLabel && (
          <span className="shrink-0 rounded-full border border-[#dedbd3] bg-[#f7f7f5] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6b6b66]">
            {statusLabel}
          </span>
        )}
      </div>
      <div
        className={cn(
          "mt-3 text-3xl font-semibold leading-none tracking-tight",
          isUnavailable ? "text-[#77756f]" : "text-[#111111]"
        )}
      >
        {renderValue(value, isUnavailable, unavailableLabel)}
      </div>
      {secondaryValue && <p className="mt-2 text-sm font-medium text-[#333333]">{secondaryValue}</p>}
      {helperText && <p className="mt-2 text-xs leading-5 text-[#6b6b66]">{helperText}</p>}
    </article>
  );
}
