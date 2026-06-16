import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AdminChartPoint } from "@/admin/types";

type AdminBarTrendChartProps = {
  data: AdminChartPoint[];
  color?: string;
};

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

export function AdminBarTrendChart({ data, color = "var(--ff-violet)" }: AdminBarTrendChartProps) {
  const hasData = data.some((d) => d.value > 0);

  if (!hasData) {
    return (
      <div className="grid h-full min-h-[200px] w-full place-items-center rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)]">
        <p className="text-sm text-[var(--color-ink-faint)]">No events recorded</p>
      </div>
    );
  }

  return (
    <div className="h-full min-h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--ff-blue-chalk)" }} />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
