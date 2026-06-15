import { z } from "zod";
import type { AdminOverviewMetrics } from "@/admin/types";

// Runtime validation for the admin_get_overview_metrics() RPC payload.
//
// The RPC returns jsonb, which TypeScript can only *assert* a shape for. These
// schemas *verify* it at the trust boundary so schema drift, an older RPC, or a
// malformed row fails closed into a safe "unavailable" state instead of leaking
// an unexpected object into typed UI code.
//
// Objects are parsed with the default (strip) behavior: only the known
// aggregate fields survive. That is the safety guarantee for this contract —
// even if a payload somehow carried user rows, emails, avatar paths, or
// creative content, none of those keys are in these schemas, so they can never
// reach the validated output. This is an aggregate-only contract.

// Aggregate counts are non-negative integers. We keep this strict (not coerced)
// because the RPC controls its own jsonb and emits real JSON numbers.
const countSchema = z.number().int().nonnegative();

// Storage object counts are deferred and may be number or null.
const storageCountSchema = z.number().int().nonnegative().nullable();

const usersMetricsSchema = z.object({
  total: countSchema,
  new7d: countSchema,
  new30d: countSchema,
});

const profilesMetricsSchema = z.object({
  total: countSchema,
  completed: countSchema,
  withUploadedAvatar: countSchema,
});

const rolesMetricsSchema = z.object({
  owners: countSchema,
  admins: countSchema,
  support: countSchema,
  reviewers: countSchema,
});

const eventsMetricsSchema = z.object({
  adminAudit24h: countSchema,
  adminAudit7d: countSchema,
  security24h: countSchema,
  security7d: countSchema,
  rateLimit24h: countSchema,
  rateLimit7d: countSchema,
});

const cloudRowsMetricsSchema = z.object({
  projects: countSchema,
  scenes: countSchema,
  sceneAssets: countSchema,
});

const storageMetricsSchema = z.object({
  avatars: storageCountSchema,
  referenceImages: storageCountSchema,
});

export const adminOverviewMetricsSchema = z.object({
  generatedAt: z.string(),
  sourceVersion: z.literal("phase-e1"),
  cloudSyncEnabled: z.boolean(),
  users: usersMetricsSchema,
  profiles: profilesMetricsSchema,
  roles: rolesMetricsSchema,
  events: eventsMetricsSchema,
  cloudRows: cloudRowsMetricsSchema,
  storage: storageMetricsSchema,
}) satisfies z.ZodType<AdminOverviewMetrics>;

export type ParsedAdminOverviewMetrics = z.infer<typeof adminOverviewMetricsSchema>;
