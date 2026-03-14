import { Subject } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertStudentOwnership, OwnershipError } from "@/modules/auth/ownership-guard";
import { isGuardianRole } from "@/modules/auth/roles";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { apiError } from "@/modules/shared/api-error";
import { logAccessDenied } from "@/modules/shared/structured-log";
import { serializeProgressItem } from "@/modules/study/serializers";
import { updateStudyProgressSchema } from "@/modules/study/schemas";
import { getCurrentSemester, isValidProgressTransition } from "@/modules/study/service";

type RouteContext = {
  params: Promise<{ curriculumNodeId: string }> | { curriculumNodeId: string };
};

async function readCurriculumNodeId(context: RouteContext) {
  const params = await context.params;
  return params.curriculumNodeId;
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    if (!isGuardianRole(session.role)) {
      logAccessDenied("study_progress_update_requires_guardian_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Guardian role is required");
    }

    const curriculumNodeId = await readCurriculumNodeId(context);

    if (!curriculumNodeId) {
      return apiError(400, "VALIDATION_ERROR", "curriculumNodeId is required");
    }

    const payload = await request.json().catch(() => null);
    const parsed = updateStudyProgressSchema.safeParse(payload);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }

    try {
      const student = await assertStudentOwnership({
        studentId: parsed.data.studentId,
        guardianUserId: session.userId,
      });
      const currentSemester = getCurrentSemester(new Date());
      const curriculumNode = await prisma.curriculumNode.findFirst({
        where: {
          id: curriculumNodeId,
          schoolLevel: student.schoolLevel,
          subject: Subject.math,
          grade: student.grade,
          semester: currentSemester,
        },
      });

      if (!curriculumNode) {
        return apiError(404, "NOT_FOUND", "Curriculum node not found");
      }

      const current = await prisma.studentUnitProgress.findUnique({
        where: {
          studentId_curriculumNodeId: {
            studentId: student.id,
            curriculumNodeId,
          },
        },
      });

      if (!isValidProgressTransition(current?.status ?? null, parsed.data.status)) {
        return apiError(409, "CONFLICT", "Study progress transition is not allowed");
      }

      const reviewedAt = new Date();
      const [hasConceptLesson, practiceSet] = await Promise.all([
        prisma.conceptLesson.findUnique({
          where: {
            curriculumNodeId,
          },
          select: {
            id: true,
          },
        }),
        prisma.practiceSet.findFirst({
          where: {
            curriculumNodeId,
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
          },
        }),
      ]);
      const updated = await prisma.studentUnitProgress.upsert({
        where: {
          studentId_curriculumNodeId: {
            studentId: student.id,
            curriculumNodeId,
          },
        },
        update: {
          status: parsed.data.status,
          note: parsed.data.note === undefined ? current?.note ?? null : parsed.data.note.trim() ? parsed.data.note.trim() : null,
          reviewedAt,
          updatedByGuardianUserId: session.userId,
        },
        create: {
          studentId: student.id,
          curriculumNodeId,
          status: parsed.data.status,
          note: parsed.data.note?.trim() ? parsed.data.note.trim() : null,
          reviewedAt,
          updatedByGuardianUserId: session.userId,
        },
      });

      return NextResponse.json(
        serializeProgressItem({
          curriculumNodeId,
          unitName: curriculumNode.unitName,
        status: updated.status,
        note: updated.note,
        lastStudiedAt: updated.lastStudiedAt,
        reviewedAt: updated.reviewedAt,
        hasConcept: Boolean(hasConceptLesson),
        practiceSetId: practiceSet?.id ?? null,
        practiceSetTitle: practiceSet?.title ?? null,
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
