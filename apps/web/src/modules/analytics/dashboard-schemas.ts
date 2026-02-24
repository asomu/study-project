import { z } from "zod";

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

export const dashboardOverviewQuerySchema = z.object({
  studentId: z.string().trim().min(1),
  date: z
    .string()
    .trim()
    .regex(dateOnlyPattern, "date must be formatted as YYYY-MM-DD")
    .optional(),
});

export const dashboardWeaknessQuerySchema = z.object({
  studentId: z.string().trim().min(1),
  period: z.enum(["weekly", "monthly"]).default("weekly"),
});

export const dashboardTrendsQuerySchema = z.object({
  studentId: z.string().trim().min(1),
  rangeStart: z
    .string()
    .trim()
    .regex(dateOnlyPattern, "rangeStart must be formatted as YYYY-MM-DD")
    .optional(),
  rangeEnd: z
    .string()
    .trim()
    .regex(dateOnlyPattern, "rangeEnd must be formatted as YYYY-MM-DD")
    .optional(),
});

export type DashboardOverviewQuery = z.infer<typeof dashboardOverviewQuerySchema>;
export type DashboardWeaknessQuery = z.infer<typeof dashboardWeaknessQuerySchema>;
export type DashboardTrendsQuery = z.infer<typeof dashboardTrendsQuerySchema>;

export function parseDashboardOverviewQuery(url: URL) {
  return dashboardOverviewQuerySchema.safeParse({
    studentId: url.searchParams.get("studentId"),
    date: url.searchParams.get("date") ?? undefined,
  });
}

export function parseDashboardWeaknessQuery(url: URL) {
  return dashboardWeaknessQuerySchema.safeParse({
    studentId: url.searchParams.get("studentId"),
    period: url.searchParams.get("period") ?? undefined,
  });
}

export function parseDashboardTrendsQuery(url: URL) {
  return dashboardTrendsQuerySchema.safeParse({
    studentId: url.searchParams.get("studentId"),
    rangeStart: url.searchParams.get("rangeStart") ?? undefined,
    rangeEnd: url.searchParams.get("rangeEnd") ?? undefined,
  });
}
