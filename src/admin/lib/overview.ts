import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { adminOverviewMetricsSchema } from "@/admin/lib/overview.schema";
import type { AdminOverviewMetrics } from "@/admin/types";

export type AdminOverviewMetricsResult = {
  data: AdminOverviewMetrics | null;
  error: string | null;
  unavailable?: boolean;
};

function logOverviewError(context: string, error: unknown) {
  if (import.meta.env.DEV) {
    console.warn(`[admin overview] ${context}`, error);
  }
}

// Runtime validation lives in overview.schema.ts. We return null on any schema
// mismatch so callers fall back to a safe "unavailable" state rather than
// rendering a malformed payload. Raw Zod issue details are only logged in dev.
function parseOverviewMetrics(value: unknown): AdminOverviewMetrics | null {
  const result = adminOverviewMetricsSchema.safeParse(value);
  if (!result.success) {
    logOverviewError("Overview metrics failed schema validation.", result.error.issues);
    return null;
  }
  return result.data;
}

function friendlyOverviewError(error: { code?: string; message?: string }): AdminOverviewMetricsResult {
  if (error.code === "42501" || /permission|forbidden|admin access/i.test(error.message ?? "")) {
    return { data: null, error: "You do not have access to admin overview metrics." };
  }

  if (error.code === "PGRST202" || /admin_get_overview_metrics/i.test(error.message ?? "")) {
    return {
      data: null,
      error: "Admin overview metrics are not available until the latest database migration is applied.",
      unavailable: true,
    };
  }

  return { data: null, error: "Admin overview metrics are temporarily unavailable.", unavailable: true };
}

export async function loadAdminOverviewMetrics(): Promise<AdminOverviewMetricsResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      data: null,
      error: "Admin overview metrics need Supabase to be configured.",
      unavailable: true,
    };
  }

  const { data, error } = await supabase.rpc("admin_get_overview_metrics");

  if (error) {
    logOverviewError("Could not load overview metrics.", error);
    return friendlyOverviewError(error);
  }

  const metrics = parseOverviewMetrics(data);
  if (!metrics) {
    logOverviewError("Overview metrics RPC returned an unexpected shape.", data);
    return { data: null, error: "Admin overview metrics returned an unexpected shape.", unavailable: true };
  }

  return { data: metrics, error: null };
}
