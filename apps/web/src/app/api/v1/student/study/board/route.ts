import { Subject } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertStudentLoginOwnership, OwnershipError } from "@/modules/auth/ownership-guard";
import { isStudentRole } from "@/modules/auth/roles";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { apiError } from "@/modules/shared/api-error";
import { logAccessDenied } from "@/modules/shared/structured-log";
import { serializeProgressItem, serializeStudySessionSummary } from "@/modules/study/serializers";
import {
  getCurrentSemester,
  getStudentCurrentSemesterNodes,
  mergeUnitProgressState,
  selectDailyMission,
  summarizeProgressStatuses,
} from "@/modules/study/service";

export async function GET(request: Request) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    if (!isStudentRole(session.role)) {
      logAccessDenied("student_study_board_requires_student_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Student role is required");
    }

    try {
      const student = await assertStudentLoginOwnership({
        loginUserId: session.userId,
      });
      const asOfDate = new Date();
      const currentSemester = getCurrentSemester(asOfDate);
      const nodes = await getStudentCurrentSemesterNodes(student, asOfDate);
      const [practiceSets, progressRows, conceptLessons, recentAttempts] = await Promise.all([
        prisma.practiceSet.findMany({
          where: {
            schoolLevel: student.schoolLevel,
            subject: Subject.math,
            grade: student.grade,
            semester: currentSemester,
            isActive: true,
          },
          orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
          include: {
            curriculumNode: {
              select: {
                unitName: true,
              },
            },
            problems: {
              select: {
                id: true,
                skillTags: true,
              },
            },
          },
        }),
        prisma.studentUnitProgress.findMany({
          where: {
            studentId: student.id,
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
          },
          orderBy: [{ submittedAt: "desc" }, { startedAt: "desc" }],
          take: 5,
          include: {
            practiceSet: {
              include: {
                curriculumNode: true,
              },
            },
            items: true,
            studyReview: true,
            workArtifact: true,
          },
        }),
      ]);

      const progressItems = mergeUnitProgressState(
        nodes,
        progressRows,
        practiceSets.map((set) => ({
          id: set.id,
          title: set.title,
          curriculumNodeId: set.curriculumNodeId,
        })),
        new Set(conceptLessons.map((lesson) => lesson.curriculumNodeId)),
      );

      const dailyMission = selectDailyMission(
        practiceSets.map((set) => ({
          practiceSetId: set.id,
          title: set.title,
          curriculumNodeId: set.curriculumNodeId,
          unitName: set.curriculumNode.unitName,
          problemCount: set.problems.length,
          sortOrder: set.sortOrder,
          progressStatus: progressItems.find((item) => item.curriculumNodeId === set.curriculumNodeId)?.status ?? "planned",
        })),
      );

      return NextResponse.json({
        student: {
          id: student.id,
          name: student.name,
          schoolLevel: student.schoolLevel,
          grade: student.grade,
        },
        dailyMission,
        practiceSets: practiceSets.map((set) => ({
          id: set.id,
          title: set.title,
          description: set.description,
          curriculumNodeId: set.curriculumNodeId,
          unitName: set.curriculumNode.unitName,
          problemCount: set.problems.length,
          skillTags: [...new Set(set.problems.flatMap((problem) => problem.skillTags))],
          progressStatus: progressItems.find((item) => item.curriculumNodeId === set.curriculumNodeId)?.status ?? "planned",
        })),
        progressSummary: summarizeProgressStatuses(progressItems),
        progress: progressItems.map(serializeProgressItem),
        recentSessions: recentAttempts.map(serializeStudySessionSummary),
        latestFeedback: recentAttempts
          .filter((attempt) => attempt.studyReview)
          .slice(0, 3)
          .map((attempt) => ({
            attemptId: attempt.id,
            practiceSetTitle: attempt.practiceSet?.title ?? "학습 세션",
            unitName: attempt.practiceSet?.curriculumNode.unitName ?? null,
            feedback: attempt.studyReview?.feedback ?? "",
            progressStatus: attempt.studyReview?.progressStatus ?? null,
            reviewedAt: attempt.studyReview?.reviewedAt ?? null,
          })),
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
