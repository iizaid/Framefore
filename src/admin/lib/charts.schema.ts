import { z } from "zod";

export const adminChartPointSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  value: z.number().int().nonnegative(),
});

export const adminOverviewChartSeriesSchema = z.object({
  generatedAt: z.string(),
  sourceVersion: z.string(),
  days: z.union([z.literal(7), z.literal(30), z.literal(90)]),
  cloudSyncEnabled: z.boolean(),
  series: z.object({
    usersByDay: z.array(adminChartPointSchema),
    profilesByDay: z.array(adminChartPointSchema),
    adminAuditByDay: z.array(adminChartPointSchema),
    securityEventsByDay: z.array(adminChartPointSchema),
    rateLimitEventsByDay: z.array(adminChartPointSchema),
  }),
  unavailableSeries: z.record(z.string(), z.string()).optional(),
});

export type AdminChartPoint = z.infer<typeof adminChartPointSchema>;
export type AdminOverviewChartSeries = z.infer<typeof adminOverviewChartSeriesSchema>;
