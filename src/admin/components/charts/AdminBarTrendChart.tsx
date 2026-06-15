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

export function AdminBarTrendChart({ data, color = "#111111" }: AdminBarTrendChartProps) {
  const hasData = data.some((d) => d.value > 0);

  if (!hasData) {
    return (
      <div className="grid h-full min-h-[200px] w-full place-items-center rounded-xl border border-dashed border-[#e8e8ec] bg-[#fafafa]">
        <p className="text-sm text-[#9ca3af]">No events recorded</p>
      </div>
    );
  }

  return (
    <div className="h-full min-h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f9fafb" }} />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
