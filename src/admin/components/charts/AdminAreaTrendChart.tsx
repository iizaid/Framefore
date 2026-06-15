import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
      <div className="rounded-lg border border-[#e8e8ec] bg-white px-3 py-2 shadow-sm">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">
          {label}
        </p>
        <p className="text-sm font-bold text-[#111111]">{payload[0].value}</p>
      </div>
    );
  }
  return null;
}

export function AdminAreaTrendChart({
  data,
  color = "#6366f1",
  fillOpacity = 0.1,
}: AdminAreaTrendChartProps) {
  // If all values are 0, it's basically an empty chart.
  const hasData = data.some((d) => d.value > 0);

  if (!hasData) {
    return (
      <div className="grid h-full min-h-[200px] w-full place-items-center rounded-xl border border-dashed border-[#e8e8ec] bg-[#fafafa]">
        <p className="text-sm text-[#9ca3af]">No activity in this range</p>
      </div>
    );
  }

  return (
    <div className="h-full min-h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={`fill-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={fillOpacity} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
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
            fill={`url(#fill-${color})`}
            activeDot={{ r: 4, strokeWidth: 0, fill: color }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
