import { Subject } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertStudentOwnership, OwnershipError } from "@/modules/auth/ownership-guard";
import { isGuardianRole } from "@/modules/auth/roles";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { apiError } from "@/modules/shared/api-error";
import { logAccessDenied } from "@/modules/shared/structured-log";
import { serializeProgressItem } from "@/modules/study/serializers";
import { parseStudyProgressQuery } from "@/modules/study/schemas";
import {
  getCurrentSemester,
  getStudentCurrentSemesterNodes,
  mergeUnitProgressState,
  summarizeProgressStatuses,
} from "@/modules/study/service";

export async function GET(request: Request) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    if (!isGuardianRole(session.role)) {
      logAccessDenied("study_progress_requires_guardian_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Guardian role is required");
    }

    const requestUrl = new URL(request.url);
    const parsed = parseStudyProgressQuery(requestUrl);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }

    try {
      const student = await assertStudentOwnership({
        studentId: parsed.data.studentId,
        guardianUserId: session.userId,
      });
      const asOfDate = new Date();
      const currentSemester = getCurrentSemester(asOfDate);
      const nodes = await getStudentCurrentSemesterNodes(student, asOfDate);
      const [practiceSets, progressRows, conceptLessons] = await Promise.all([
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
      ]);

      const progress = mergeUnitProgressState(
        nodes,
        progressRows,
        practiceSets,
        new Set(conceptLessons.map((lesson) => lesson.curriculumNodeId)),
      );

      return NextResponse.json({
        student: {
          id: student.id,
          name: student.name,
          schoolLevel: student.schoolLevel,
          grade: student.grade,
        },
        summary: summarizeProgressStatuses(progress),
        progress: progress.map(serializeProgressItem),
      });
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
