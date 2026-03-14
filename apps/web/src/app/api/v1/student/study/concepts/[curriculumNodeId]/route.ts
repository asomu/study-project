import { Subject } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertStudentLoginOwnership, OwnershipError } from "@/modules/auth/ownership-guard";
import { isStudentRole } from "@/modules/auth/roles";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { apiError } from "@/modules/shared/api-error";
import { logAccessDenied } from "@/modules/shared/structured-log";
import { getCurrentSemester } from "@/modules/study/service";

type RouteContext = {
  params: Promise<{ curriculumNodeId: string }> | { curriculumNodeId: string };
};

async function readCurriculumNodeId(context: RouteContext) {
  const params = await context.params;
  return params.curriculumNodeId;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    if (!isStudentRole(session.role)) {
      logAccessDenied("student_study_concepts_requires_student_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Student role is required");
    }

    const curriculumNodeId = await readCurriculumNodeId(context);

    if (!curriculumNodeId) {
      return apiError(400, "VALIDATION_ERROR", "curriculumNodeId is required");
    }

    try {
      const student = await assertStudentLoginOwnership({
        loginUserId: session.userId,
      });
      const asOfDate = new Date();
      const currentSemester = getCurrentSemester(asOfDate);

      const lesson = await prisma.conceptLesson.findFirst({
        where: {
          curriculumNodeId,
          curriculumNode: {
            schoolLevel: student.schoolLevel,
            subject: Subject.math,
            grade: student.grade,
            semester: currentSemester,
            activeFrom: {
              lte: asOfDate,
            },
            OR: [{ activeTo: null }, { activeTo: { gte: asOfDate } }],
          },
        },
        include: {
          curriculumNode: true,
        },
      });

      if (!lesson) {
        return apiError(404, "NOT_FOUND", "Concept lesson not found");
      }

      const practiceSet = await prisma.practiceSet.findFirst({
        where: {
          curriculumNodeId,
          schoolLevel: student.schoolLevel,
          subject: Subject.math,
          grade: student.grade,
          semester: currentSemester,
          isActive: true,
        },
        orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
        include: {
          problems: {
            select: {
              id: true,
            },
          },
        },
      });

      return NextResponse.json({
        lesson: {
          id: lesson.id,
          curriculumNodeId: lesson.curriculumNodeId,
          unitName: lesson.curriculumNode.unitName,
          title: lesson.title,
          summary: lesson.summary,
          content: lesson.contentJson,
        },
        recommendedPracticeSet: practiceSet
          ? {
              id: practiceSet.id,
              title: practiceSet.title,
              problemCount: practiceSet.problems.length,
            }
          : null,
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
