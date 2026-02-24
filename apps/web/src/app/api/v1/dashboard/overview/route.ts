import { Subject } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildTrendPoints,
  calculateAccuracyPct,
  calculateActualPct,
  calculateConsistencyPct,
  calculateDifficultyWeightedAccuracyPct,
  calculateOverallScorePct,
  calculateRecommendedPct,
} from "@/modules/analytics/dashboard-metrics";
import { parseDashboardOverviewQuery } from "@/modules/analytics/dashboard-schemas";
import { assertStudentOwnership, OwnershipError } from "@/modules/auth/ownership-guard";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import {
  addDaysUtc,
  endOfDayUtc,
  formatDateOnly,
  getSemesterRange,
  listWeeklyBuckets,
  parseDateOnly,
  startOfDayUtc,
} from "@/modules/dashboard/date-range";
import { serializeDashboardOverview } from "@/modules/dashboard/serializers";
import { apiError } from "@/modules/shared/api-error";

export async function GET(request: Request) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    const requestUrl = new URL(request.url);
    const parsed = parseDashboardOverviewQuery(requestUrl);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }

    const asOfDate = parsed.data.date ? parseDateOnly(parsed.data.date) : startOfDayUtc(new Date());

    if (!asOfDate) {
      return apiError(400, "VALIDATION_ERROR", "date must be a valid date string");
    }

    try {
      const student = await assertStudentOwnership({
        studentId: parsed.data.studentId,
        guardianUserId: session.userId,
      });

      const semester = getSemesterRange(asOfDate);
      const recentStart = addDaysUtc(asOfDate, -27);
      const asOfDateEnd = endOfDayUtc(asOfDate);
      const weeklyBuckets = listWeeklyBuckets(recentStart, asOfDate);

      const [activeCurriculumNodes, coveredUnitsInSemester, recentAttemptItems, totalAttempts, totalItems, wrongAnswers] =
        await Promise.all([
          prisma.curriculumNode.findMany({
            where: {
              schoolLevel: student.schoolLevel,
              subject: Subject.math,
              grade: student.grade,
              semester: semester.semester,
              activeFrom: {
                lte: asOfDate,
              },
              OR: [{ activeTo: null }, { activeTo: { gte: asOfDate } }],
            },
            orderBy: [{ curriculumVersion: "desc" }, { sortOrder: "asc" }, { unitCode: "asc" }],
            select: {
              id: true,
              curriculumVersion: true,
            },
          }),
          prisma.attemptItem.findMany({
            where: {
              attempt: {
                studentId: student.id,
                attemptDate: {
                  gte: semester.start,
                  lte: asOfDateEnd,
                },
              },
            },
            select: {
              curriculumNodeId: true,
            },
            distinct: ["curriculumNodeId"],
          }),
          prisma.attemptItem.findMany({
            where: {
              attempt: {
                studentId: student.id,
                attemptDate: {
                  gte: recentStart,
                  lte: asOfDateEnd,
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
          }),
          prisma.attempt.count({
            where: {
              studentId: student.id,
              attemptDate: {
                lte: asOfDateEnd,
              },
            },
          }),
          prisma.attemptItem.count({
            where: {
              attempt: {
                studentId: student.id,
                attemptDate: {
                  lte: asOfDateEnd,
                },
              },
            },
          }),
          prisma.wrongAnswer.count({
            where: {
              attemptItem: {
                attempt: {
                  studentId: student.id,
                  attemptDate: {
                    lte: asOfDateEnd,
                  },
                },
              },
            },
          }),
        ]);

      const resolvedCurriculumVersion = activeCurriculumNodes[0]?.curriculumVersion ?? null;
      const activeUnitIds = new Set(
        resolvedCurriculumVersion
          ? activeCurriculumNodes
              .filter((node) => node.curriculumVersion === resolvedCurriculumVersion)
              .map((node) => node.id)
          : [],
      );
      const totalUnits = activeUnitIds.size;
      const coveredUnits = coveredUnitsInSemester.filter((item) => activeUnitIds.has(item.curriculumNodeId)).length;
      const recommendedPct = calculateRecommendedPct(semester.start, semester.end, asOfDate);
      const actualPct = calculateActualPct(coveredUnits, totalUnits);
      const recentCorrectItems = recentAttemptItems.filter((item) => item.isCorrect).length;
      const recentAccuracyPct = calculateAccuracyPct(recentCorrectItems, recentAttemptItems.length);
      const difficultyWeightedAccuracyPct = calculateDifficultyWeightedAccuracyPct(recentAttemptItems);
      const weeklyTrendPoints = buildTrendPoints(
        recentAttemptItems.map((item) => ({
          curriculumNodeId: item.curriculumNodeId,
          isCorrect: item.isCorrect,
          difficulty: item.difficulty,
          attemptDate: item.attempt.attemptDate,
        })),
        weeklyBuckets,
      );
      const weeklyAccuracies = weeklyTrendPoints.filter((point) => point.totalItems > 0).map((point) => point.accuracyPct);
      const consistencyPct = calculateConsistencyPct(weeklyAccuracies, recentAccuracyPct);
      const overallScorePct = calculateOverallScorePct({
        recentAccuracyPct,
        consistencyPct,
        difficultyWeightedAccuracyPct,
      });

      return NextResponse.json(
        serializeDashboardOverview({
          progress: {
            recommendedPct,
            actualPct,
            coveredUnits,
            totalUnits,
          },
          mastery: {
            overallScorePct,
            recentAccuracyPct,
            difficultyWeightedAccuracyPct,
          },
          summary: {
            totalAttempts,
            totalItems,
            wrongAnswers,
            asOfDate: formatDateOnly(asOfDate),
          },
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
