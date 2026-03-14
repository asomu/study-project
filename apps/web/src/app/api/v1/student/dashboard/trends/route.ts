import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildTrendPoints } from "@/modules/analytics/dashboard-metrics";
import { assertStudentLoginOwnership, OwnershipError } from "@/modules/auth/ownership-guard";
import { isStudentRole } from "@/modules/auth/roles";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { addDaysUtc, endOfDayUtc, listWeeklyBuckets, startOfDayUtc } from "@/modules/dashboard/date-range";
import { apiError } from "@/modules/shared/api-error";
import { logAccessDenied } from "@/modules/shared/structured-log";

export async function GET(request: Request) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    if (!isStudentRole(session.role)) {
      logAccessDenied("student_dashboard_trends_requires_student_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Student role is required");
    }

    try {
      const student = await assertStudentLoginOwnership({
        loginUserId: session.userId,
      });
      const rangeEnd = startOfDayUtc(new Date());
      const rangeStart = addDaysUtc(rangeEnd, -27);
      const buckets = listWeeklyBuckets(rangeStart, rangeEnd);
      const items = await prisma.attemptItem.findMany({
        where: {
          attempt: {
            studentId: student.id,
            attemptDate: {
              gte: rangeStart,
              lte: endOfDayUtc(rangeEnd),
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

      return NextResponse.json({
        points: buildTrendPoints(
          items.map((item) => ({
            curriculumNodeId: item.curriculumNodeId,
            isCorrect: item.isCorrect,
            difficulty: item.difficulty,
            attemptDate: item.attempt.attemptDate,
          })),
          buckets,
        ),
      });
    } catch (error) {
      if (error instanceof OwnershipError) {
        return apiError(403, "FORBIDDEN", "Student profile linkage verification failed");
      }

      throw error;
    }
  } catch {
    return apiError(500, "INTERNAL_SERVER_ERROR", "Unexpected server error");
  }
}
