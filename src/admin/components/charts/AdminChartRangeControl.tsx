import { cn } from "@/lib/utils";

type Range = 7 | 30 | 90;

type AdminChartRangeControlProps = {
  value: Range;
  onChange: (value: Range) => void;
  disabled?: boolean;
};

const RANGES: { label: string; value: Range }[] = [
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
];

export function AdminChartRangeControl({ value, onChange, disabled }: AdminChartRangeControlProps) {
  return (
    <div className="flex items-center rounded-lg bg-[#f3f4f6] p-1 shadow-inner">
      {RANGES.map((range) => (
        <button
          key={range.value}
          disabled={disabled}
          onClick={() => onChange(range.value)}
          className={cn(
            "rounded-md px-3 py-1 text-xs font-medium transition-all",
            value === range.value
              ? "bg-white text-[#111111] shadow-sm"
              : "text-[#6b7280] hover:text-[#111111]",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
