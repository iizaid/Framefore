import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useId } from "react";
import type { AdminChartPoint } from "@/admin/types";

type AdminAreaTrendChartProps = {
  data: AdminChartPoint[];
  color?: string;
  fillOpacity?: number;
};

// Custom tooltip for premium look
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-[var(--radius-button)] border border-[var(--color-border)] bg-white px-3 py-2 shadow-[var(--ff-shadow-subtle)]">
        <p className="mb-1 font-mono-ui text-[10px] font-semibold uppercase text-[var(--color-ink-faint)]">
          {label}
        </p>
        <p className="text-sm font-bold text-[var(--ff-ink)]">{payload[0].value}</p>
      </div>
    );
  }
  return null;
}

export function AdminAreaTrendChart({
  data,
  color = "var(--ff-violet)",
  fillOpacity = 0.1,
}: AdminAreaTrendChartProps) {
  const gradientId = `admin-area-trend-fill-${useId().replace(/:/g, "")}`;

  // If all values are 0, it's basically an empty chart.
  const hasData = data.some((d) => d.value > 0);

  if (!hasData) {
    return (
      <div className="grid h-full min-h-[200px] w-full place-items-center rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)]">
        <p className="text-sm text-[var(--color-ink-faint)]">No activity in this range</p>
      </div>
    );
  }

  return (
    <div className="h-full min-h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={fillOpacity} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--ff-linen)" />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={false}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#e5e7eb", strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fillOpacity={1}
            fill={`url(#${gradientId})`}
            activeDot={{ r: 4, strokeWidth: 0, fill: color }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
