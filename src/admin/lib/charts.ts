import { supabase } from "@/lib/supabase";
import { adminOverviewChartSeriesSchema } from "./charts.schema";
import type { AdminOverviewChartSeriesResult } from "@/admin/types";

export async function loadAdminOverviewChartSeries({ days }: { days: 7 | 30 | 90 }): Promise<AdminOverviewChartSeriesResult> {
  try {
    if (!supabase) {
      return { data: null, error: "Supabase client not configured", unavailable: true };
    }
    const { data, error } = await supabase.rpc("admin_get_overview_chart_series", { p_days: days });

    if (error) {
      if (error.code === "PGRST202" || error.message.includes("Could not find the function")) {
        return { data: null, error: "Chart data unavailable. Migration 0012 has not been applied.", unavailable: true };
      }
      if (error.code === "insufficient_privilege" || error.message.includes("Access denied")) {
        return { data: null, error: "Access denied. Caller is not an admin." };
      }
      if (error.code === "22023") {
        return { data: null, error: `Invalid chart range (${days} days) requested.` };
      }
      return { data: null, error: error.message };
    }

    if (!data) {
      return { data: null, error: "No chart data returned from server." };
    }

    const parsed = adminOverviewChartSeriesSchema.safeParse(data);
    if (!parsed.success) {
      console.error("Invalid chart series payload:", parsed.error);
      return { data: null, error: "Chart data validation failed." };
    }

    return { data: parsed.data, error: null };
  } catch (err) {
    console.error("Unexpected error loading chart series:", err);
    return { data: null, error: "An unexpected error occurred while loading charts." };
  }
}
