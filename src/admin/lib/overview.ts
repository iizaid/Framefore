import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { AdminOverviewMetrics } from "@/admin/types";

export type AdminOverviewMetricsResult = {
  data: AdminOverviewMetrics | null;
  error: string | null;
  unavailable?: boolean;
};

type JsonRecord = Record<string, unknown>;

function logOverviewError(context: string, error: unknown) {
  if (import.meta.env.DEV) {
    console.warn(`[admin overview] ${context}`, error);
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function asNullableNumber(value: unknown): number | null {
  if (value == null) return null;
  return asNumber(value);
}

function parseOverviewMetrics(value: unknown): AdminOverviewMetrics | null {
  if (!isRecord(value)) return null;

  const users = isRecord(value.users) ? value.users : {};
  const profiles = isRecord(value.profiles) ? value.profiles : {};
  const roles = isRecord(value.roles) ? value.roles : {};
  const events = isRecord(value.events) ? value.events : {};
  const cloudRows = isRecord(value.cloudRows) ? value.cloudRows : {};
  const storage = isRecord(value.storage) ? value.storage : {};

  return {
    generatedAt: typeof value.generatedAt === "string" ? value.generatedAt : new Date().toISOString(),
    sourceVersion: "phase-e1",
    cloudSyncEnabled: value.cloudSyncEnabled === true,
    users: {
      total: asNumber(users.total),
      new7d: asNumber(users.new7d),
      new30d: asNumber(users.new30d),
    },
    profiles: {
      total: asNumber(profiles.total),
      completed: asNumber(profiles.completed),
      withUploadedAvatar: asNumber(profiles.withUploadedAvatar),
    },
    roles: {
      owners: asNumber(roles.owners),
      admins: asNumber(roles.admins),
      support: asNumber(roles.support),
      reviewers: asNumber(roles.reviewers),
    },
    events: {
      adminAudit24h: asNumber(events.adminAudit24h),
      adminAudit7d: asNumber(events.adminAudit7d),
      security24h: asNumber(events.security24h),
      security7d: asNumber(events.security7d),
      rateLimit24h: asNumber(events.rateLimit24h),
      rateLimit7d: asNumber(events.rateLimit7d),
    },
    cloudRows: {
      projects: asNumber(cloudRows.projects),
      scenes: asNumber(cloudRows.scenes),
      sceneAssets: asNumber(cloudRows.sceneAssets),
    },
    storage: {
      avatars: asNullableNumber(storage.avatars),
      referenceImages: asNullableNumber(storage.referenceImages),
    },
  };
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
