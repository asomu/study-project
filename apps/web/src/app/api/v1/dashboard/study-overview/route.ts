import { Subject } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertStudentOwnership, OwnershipError } from "@/modules/auth/ownership-guard";
import { isGuardianRole } from "@/modules/auth/roles";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { parseDateOnly, startOfDayUtc, endOfDayUtc } from "@/modules/dashboard/date-range";
import {
  buildAttentionUnits,
  buildRecommendedActions,
  summarizeStudyOverview,
  type DashboardStudyProgressItem,
  type DashboardStudyReviewQueueItem,
} from "@/modules/dashboard/study-overview";
import { serializeDashboardStudyOverview } from "@/modules/dashboard/serializers";
import { apiError } from "@/modules/shared/api-error";
import { logAccessDenied } from "@/modules/shared/structured-log";
import { parseDashboardStudyOverviewQuery } from "@/modules/analytics/dashboard-schemas";
import {
  getCurrentSemester,
  getStudentCurrentSemesterNodes,
  mergeUnitProgressState,
  sortReviewQueue,
} from "@/modules/study/service";

export async function GET(request: Request) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    if (!isGuardianRole(session.role)) {
      logAccessDenied("guardian_dashboard_study_overview_requires_guardian_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Guardian role is required");
    }

    const requestUrl = new URL(request.url);
    const parsed = parseDashboardStudyOverviewQuery(requestUrl);

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
      const currentSemester = getCurrentSemester(asOfDate);
      const asOfDateEnd = endOfDayUtc(asOfDate);
      const nodes = await getStudentCurrentSemesterNodes(student, asOfDate);

      const [practiceSets, progressRows, conceptLessons, attempts] = await Promise.all([
        prisma.practiceSet.findMany({
          where: {
            schoolLevel: student.schoolLevel,
            subject: Subject.math,
            grade: student.grade,
            semester: currentSemester,
            isActive: true,
          },
          orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
          select: {
            id: true,
            title: true,
            curriculumNodeId: true,
          },
        }),
        prisma.studentUnitProgress.findMany({
          where: {
            studentId: student.id,
            curriculumNodeId: {
              in: nodes.map((node) => node.id),
            },
          },
        }),
        prisma.conceptLesson.findMany({
          where: {
            curriculumNodeId: {
              in: nodes.map((node) => node.id),
            },
          },
          select: {
            curriculumNodeId: true,
          },
        }),
        prisma.attempt.findMany({
          where: {
            studentId: student.id,
            sourceType: "practice",
            submittedAt: {
              not: null,
              lte: asOfDateEnd,
            },
          },
          orderBy: [{ submittedAt: "desc" }, { startedAt: "desc" }],
          include: {
            practiceSet: {
              include: {
                curriculumNode: true,
              },
            },
            items: {
              select: {
                isCorrect: true,
              },
            },
            studyReview: {
              select: {
                id: true,
              },
            },
          },
        }),
      ]);

      const progress = mergeUnitProgressState(
        nodes,
        progressRows,
        practiceSets,
        new Set(conceptLessons.map((lesson) => lesson.curriculumNodeId)),
      ) as DashboardStudyProgressItem[];

      const orderedQueue = sortReviewQueue(
        attempts.map((attempt) => ({
          attemptId: attempt.id,
          submittedAt: attempt.submittedAt ?? attempt.attemptDate,
          elapsedSeconds: attempt.elapsedSeconds,
          wrongItems: attempt.items.filter((item) => !item.isCorrect).length,
          hasReview: Boolean(attempt.studyReview),
          practiceSetId: attempt.practiceSet?.id ?? null,
          practiceSetTitle: attempt.practiceSet?.title ?? null,
          curriculumNodeId: attempt.practiceSet?.curriculumNodeId ?? null,
          unitName: attempt.practiceSet?.curriculumNode.unitName ?? null,
        })),
      ) as DashboardStudyReviewQueueItem[];

      const { summary, progressSummary } = summarizeStudyOverview(orderedQueue, progress, asOfDate);

      return NextResponse.json(
        serializeDashboardStudyOverview({
          student: {
            id: student.id,
            name: student.name,
            schoolLevel: student.schoolLevel,
            grade: student.grade,
          },
          summary,
          progressSummary,
          recommendedActions: buildRecommendedActions({
            studentId: student.id,
            reviewQueue: orderedQueue,
            progress,
            asOfDate,
          }),
          reviewQueuePreview: orderedQueue.slice(0, 3),
          attentionUnits: buildAttentionUnits(progress),
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
