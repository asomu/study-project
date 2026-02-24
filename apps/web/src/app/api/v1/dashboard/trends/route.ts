import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildTrendPoints } from "@/modules/analytics/dashboard-metrics";
import { parseDashboardTrendsQuery } from "@/modules/analytics/dashboard-schemas";
import { assertStudentOwnership, OwnershipError } from "@/modules/auth/ownership-guard";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { addDaysUtc, endOfDayUtc, listWeeklyBuckets, parseDateOnly, startOfDayUtc } from "@/modules/dashboard/date-range";
import { serializeDashboardTrends } from "@/modules/dashboard/serializers";
import { apiError } from "@/modules/shared/api-error";

export async function GET(request: Request) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    const requestUrl = new URL(request.url);
    const parsed = parseDashboardTrendsQuery(requestUrl);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }

    const resolvedRangeEnd = parsed.data.rangeEnd ? parseDateOnly(parsed.data.rangeEnd) : startOfDayUtc(new Date());
    const resolvedRangeStart = parsed.data.rangeStart
      ? parseDateOnly(parsed.data.rangeStart)
      : resolvedRangeEnd
        ? addDaysUtc(resolvedRangeEnd, -27)
        : null;

    if (!resolvedRangeStart || !resolvedRangeEnd) {
      return apiError(400, "VALIDATION_ERROR", "rangeStart/rangeEnd must be valid date strings");
    }

    if (resolvedRangeStart > resolvedRangeEnd) {
      return apiError(400, "VALIDATION_ERROR", "rangeStart must be before or equal to rangeEnd");
    }

    const rangeEnd = endOfDayUtc(resolvedRangeEnd);
    const weeklyBuckets = listWeeklyBuckets(resolvedRangeStart, resolvedRangeEnd);

    try {
      await assertStudentOwnership({
        studentId: parsed.data.studentId,
        guardianUserId: session.userId,
      });

      const items = await prisma.attemptItem.findMany({
        where: {
          attempt: {
            studentId: parsed.data.studentId,
            attemptDate: {
              gte: resolvedRangeStart,
              lte: rangeEnd,
            },
          },
        },
        select: {
          curriculumNodeId: true,
          isCorrect: true,
          difficulty: true,
          attempt: {
            select: {
              attemptDate: true,
            },
          },
        },
      });

      const points = buildTrendPoints(
        items.map((item) => ({
          curriculumNodeId: item.curriculumNodeId,
          isCorrect: item.isCorrect,
          difficulty: item.difficulty,
          attemptDate: item.attempt.attemptDate,
        })),
        weeklyBuckets,
      );

      return NextResponse.json(
        serializeDashboardTrends({
          points,
        }),
      );
    } catch (error) {
      if (error instanceof OwnershipError) {
        return apiError(403, "FORBIDDEN", "Student ownership verification failed");
      }

      throw error;
    }
  } catch {
    return apiError(500, "INTERNAL_SERVER_ERROR", "Unexpected server error");
  }
}
