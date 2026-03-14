import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateAccuracyPct, rankWeakUnits } from "@/modules/analytics/dashboard-metrics";
import { assertStudentLoginOwnership, OwnershipError } from "@/modules/auth/ownership-guard";
import { isStudentRole } from "@/modules/auth/roles";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { addDaysUtc, endOfDayUtc, formatDateOnly, startOfDayUtc } from "@/modules/dashboard/date-range";
import { serializeWrongAnswer } from "@/modules/mistake-note/serializers";
import { apiError } from "@/modules/shared/api-error";
import { logAccessDenied } from "@/modules/shared/structured-log";

const wrongAnswerInclude = {
  categories: {
    include: {
      category: true,
    },
  },
  attemptItem: {
    include: {
      attempt: true,
    },
  },
} as const;

export async function GET(request: Request) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    if (!isStudentRole(session.role)) {
      logAccessDenied("student_dashboard_overview_requires_student_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Student role is required");
    }

    try {
      const student = await assertStudentLoginOwnership({
        loginUserId: session.userId,
      });
      const today = startOfDayUtc(new Date());
      const todayEnd = endOfDayUtc(today);
      const recentWeekStart = addDaysUtc(today, -6);
      const recentMonthStart = addDaysUtc(today, -29);

      const [todayItems, recentWeekItems, recentMonthItems, totalAttempts, totalItems, recentWrongAnswers] =
        await Promise.all([
          prisma.attemptItem.findMany({
            where: {
              attempt: {
                studentId: student.id,
                attemptDate: {
                  gte: today,
                  lte: todayEnd,
                },
              },
            },
            select: {
              isCorrect: true,
            },
          }),
          prisma.attemptItem.findMany({
            where: {
              attempt: {
                studentId: student.id,
                attemptDate: {
                  gte: recentWeekStart,
                  lte: todayEnd,
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
          prisma.attemptItem.findMany({
            where: {
              attempt: {
                studentId: student.id,
                attemptDate: {
                  gte: recentMonthStart,
                  lte: todayEnd,
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
          prisma.attempt.count({
            where: {
              studentId: student.id,
            },
          }),
          prisma.attemptItem.count({
            where: {
              attempt: {
                studentId: student.id,
              },
            },
          }),
          prisma.wrongAnswer.findMany({
            where: {
              attemptItem: {
                attempt: {
                  studentId: student.id,
                },
              },
            },
            include: wrongAnswerInclude,
            orderBy: {
              createdAt: "desc",
            },
            take: 3,
          }),
        ]);

      const todayCorrect = todayItems.filter((item) => item.isCorrect).length;
      const recentWeekCorrect = recentWeekItems.filter((item) => item.isCorrect).length;
      const weakUnits = rankWeakUnits(
        recentMonthItems.map((item) => ({
          curriculumNodeId: item.curriculumNodeId,
          unitName: item.curriculumNode.unitName,
          isCorrect: item.isCorrect,
        })),
        2,
        3,
      );

      const hasData = totalItems > 0;

      return NextResponse.json({
        student: {
          id: student.id,
          name: student.name,
          schoolLevel: student.schoolLevel,
          grade: student.grade,
        },
        today: {
          date: formatDateOnly(today),
          totalItems: todayItems.length,
          correctItems: todayCorrect,
          accuracyPct: calculateAccuracyPct(todayCorrect, todayItems.length),
        },
        recent7Days: {
          totalItems: recentWeekItems.length,
          correctItems: recentWeekCorrect,
          accuracyPct: calculateAccuracyPct(recentWeekCorrect, recentWeekItems.length),
        },
        focus: {
          weakUnits,
        },
        review: {
          recentWrongAnswers: recentWrongAnswers.map(serializeWrongAnswer),
        },
        summary: {
          totalAttempts,
          totalItems,
          hasData,
        },
        nextAction: hasData
          ? {
              label: "최근 오답 1건 다시 보기",
              description: "가장 최근에 틀린 문제의 실수 원인을 먼저 확인해 보세요.",
            }
          : {
              label: "첫 학습 기록 기다리는 중",
              description: "보호자가 첫 학습 기록을 입력하면 여기에 학습 흐름이 나타납니다.",
            },
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
