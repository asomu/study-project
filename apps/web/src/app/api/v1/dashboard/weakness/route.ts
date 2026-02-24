import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateCategoryDistribution, rankWeakUnits } from "@/modules/analytics/dashboard-metrics";
import { parseDashboardWeaknessQuery } from "@/modules/analytics/dashboard-schemas";
import { assertStudentOwnership, OwnershipError } from "@/modules/auth/ownership-guard";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { addDaysUtc, endOfDayUtc, startOfDayUtc } from "@/modules/dashboard/date-range";
import { serializeDashboardWeakness } from "@/modules/dashboard/serializers";
import { apiError } from "@/modules/shared/api-error";

export async function GET(request: Request) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    const requestUrl = new URL(request.url);
    const parsed = parseDashboardWeaknessQuery(requestUrl);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }

    const today = startOfDayUtc(new Date());
    const rangeStart = addDaysUtc(today, parsed.data.period === "monthly" ? -29 : -6);
    const rangeEnd = endOfDayUtc(today);

    try {
      await assertStudentOwnership({
        studentId: parsed.data.studentId,
        guardianUserId: session.userId,
      });

      const [attemptItems, categoryEntries] = await Promise.all([
        prisma.attemptItem.findMany({
          where: {
            attempt: {
              studentId: parsed.data.studentId,
              attemptDate: {
                gte: rangeStart,
                lte: rangeEnd,
              },
            },
          },
          select: {
            curriculumNodeId: true,
            isCorrect: true,
            curriculumNode: {
              select: {
                unitName: true,
              },
            },
          },
        }),
        prisma.wrongAnswerCategoryMap.findMany({
          where: {
            wrongAnswer: {
              attemptItem: {
                attempt: {
                  studentId: parsed.data.studentId,
                  attemptDate: {
                    gte: rangeStart,
                    lte: rangeEnd,
                  },
                },
              },
            },
          },
          select: {
            category: {
              select: {
                key: true,
                labelKo: true,
              },
            },
          },
        }),
      ]);

      const weakUnits = rankWeakUnits(
        attemptItems.map((item) => ({
          curriculumNodeId: item.curriculumNodeId,
          unitName: item.curriculumNode.unitName,
          isCorrect: item.isCorrect,
        })),
        3,
        5,
      );

      const categoryDistribution = calculateCategoryDistribution(
        categoryEntries.map((entry) => ({
          key: entry.category.key,
          labelKo: entry.category.labelKo,
        })),
      );

      return NextResponse.json(
        serializeDashboardWeakness({
          weakUnits,
          categoryDistribution,
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
