import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertStudentLoginOwnership, OwnershipError } from "@/modules/auth/ownership-guard";
import { isStudentRole } from "@/modules/auth/roles";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { apiError } from "@/modules/shared/api-error";
import { logAccessDenied } from "@/modules/shared/structured-log";
import { isGradeAllowedForSchoolLevel } from "@/modules/wrong-note/constants";
import { serializeWrongNote, wrongNoteInclude } from "@/modules/wrong-note/serializers";
import { getWrongNoteCurriculumNodeWhere, normalizeOptionalText } from "@/modules/wrong-note/service";
import { updateStudentWrongNoteSchema } from "@/modules/wrong-note/schemas";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

async function readWrongNoteId(context: RouteContext) {
  const params = await context.params;
  return params.id;
}

async function getValidatedStudentWorkbookSelection(params: {
  studentId: string;
  studentWorkbookId: string;
  workbookTemplateStageId: string;
}) {
  const studentWorkbook = await prisma.studentWorkbook.findFirst({
    where: {
      id: params.studentWorkbookId,
      studentId: params.studentId,
      isArchived: false,
      workbookTemplate: {
        isActive: true,
      },
    },
    include: {
      workbookTemplate: {
        include: {
          stages: true,
        },
      },
    },
  });

  if (!studentWorkbook) {
    return {
      error: "studentWorkbookId is not assigned to the student",
    } as const;
  }

  const stage = studentWorkbook.workbookTemplate.stages.find((item) => item.id === params.workbookTemplateStageId);

  if (!stage) {
    return {
      error: "workbookTemplateStageId does not belong to the selected workbook",
    } as const;
  }

  return {
    studentWorkbook,
    stage,
  } as const;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    if (!isStudentRole(session.role)) {
      logAccessDenied("student_wrong_note_detail_requires_student_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Student role is required");
    }

    const wrongNoteId = await readWrongNoteId(context);

    if (!wrongNoteId) {
      return apiError(400, "VALIDATION_ERROR", "wrongNote id is required");
    }

    try {
      const student = await assertStudentLoginOwnership({
        loginUserId: session.userId,
      });
      const wrongNote = await prisma.wrongNote.findFirst({
        where: {
          id: wrongNoteId,
          studentId: student.id,
          deletedAt: null,
        },
        include: wrongNoteInclude,
      });

      if (!wrongNote) {
        return apiError(404, "NOT_FOUND", "Wrong note not found");
      }

      return NextResponse.json(
        serializeWrongNote(wrongNote, {
          kind: "student",
        }),
      );
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

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    if (!isStudentRole(session.role)) {
      logAccessDenied("student_wrong_note_update_requires_student_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Student role is required");
    }

    const wrongNoteId = await readWrongNoteId(context);

    if (!wrongNoteId) {
      return apiError(400, "VALIDATION_ERROR", "wrongNote id is required");
    }

    const payload = await request.json().catch(() => null);
    const parsed = updateStudentWrongNoteSchema.safeParse(payload);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }

    try {
      const student = await assertStudentLoginOwnership({
        loginUserId: session.userId,
      });
      const existing = await prisma.wrongNote.findFirst({
        where: {
          id: wrongNoteId,
          studentId: student.id,
          deletedAt: null,
        },
        select: {
          id: true,
          studentWorkbookId: true,
          workbookTemplateStageId: true,
          curriculumNodeId: true,
          curriculumNode: {
            select: {
              id: true,
              grade: true,
              semester: true,
            },
          },
        },
      });

      if (!existing) {
        return apiError(404, "NOT_FOUND", "Wrong note not found");
      }

      if (parsed.data.grade && !isGradeAllowedForSchoolLevel(student.schoolLevel, parsed.data.grade)) {
        return apiError(400, "VALIDATION_ERROR", "grade is not available for the student's school level");
      }

      const nextGrade = parsed.data.grade ?? existing.curriculumNode.grade;
      const nextSemester = parsed.data.semester ?? existing.curriculumNode.semester;
      const nextCurriculumNodeId = parsed.data.curriculumNodeId ?? existing.curriculumNodeId;
      const nextStudentWorkbookId =
        parsed.data.studentWorkbookId === undefined ? existing.studentWorkbookId : parsed.data.studentWorkbookId;
      const nextWorkbookTemplateStageId =
        parsed.data.workbookTemplateStageId === undefined
          ? existing.workbookTemplateStageId
          : parsed.data.workbookTemplateStageId;

      const curriculumNode =
        parsed.data.curriculumNodeId && parsed.data.semester && parsed.data.grade
          ? await prisma.curriculumNode.findFirst({
              where: getWrongNoteCurriculumNodeWhere({
                schoolLevel: student.schoolLevel,
                grade: parsed.data.grade,
                curriculumNodeId: parsed.data.curriculumNodeId,
                semester: parsed.data.semester,
              }),
              select: {
                id: true,
                grade: true,
                semester: true,
              },
            })
          : existing.curriculumNode;

      if (!curriculumNode || curriculumNode.id !== nextCurriculumNodeId) {
        return apiError(400, "VALIDATION_ERROR", "curriculumNodeId is not available for the student and semester");
      }

      if ((nextStudentWorkbookId === null) !== (nextWorkbookTemplateStageId === null)) {
        return apiError(400, "VALIDATION_ERROR", "studentWorkbookId and workbookTemplateStageId must be cleared together");
      }

      if (nextStudentWorkbookId && nextWorkbookTemplateStageId) {
        const workbookSelection = await getValidatedStudentWorkbookSelection({
          studentId: student.id,
          studentWorkbookId: nextStudentWorkbookId,
          workbookTemplateStageId: nextWorkbookTemplateStageId,
        });

        if ("error" in workbookSelection) {
          return apiError(400, "VALIDATION_ERROR", workbookSelection.error ?? "Invalid workbook selection");
        }

        if (
          workbookSelection.studentWorkbook.workbookTemplate.grade !== nextGrade ||
          workbookSelection.studentWorkbook.workbookTemplate.semester !== nextSemester
        ) {
          return apiError(400, "VALIDATION_ERROR", "Workbook template grade and semester must match the wrong-note unit");
        }
      }

      const updated = await prisma.wrongNote.update({
        where: {
          id: wrongNoteId,
        },
        data: {
          ...(parsed.data.curriculumNodeId ? { curriculumNodeId: parsed.data.curriculumNodeId } : {}),
          ...(parsed.data.reason ? { reason: parsed.data.reason } : {}),
          ...(parsed.data.studentMemo !== undefined ? { studentMemo: normalizeOptionalText(parsed.data.studentMemo) } : {}),
          ...(parsed.data.studentWorkbookId !== undefined ? { studentWorkbookId: parsed.data.studentWorkbookId } : {}),
          ...(parsed.data.workbookTemplateStageId !== undefined
            ? { workbookTemplateStageId: parsed.data.workbookTemplateStageId }
            : {}),
        },
        include: wrongNoteInclude,
      });

      return NextResponse.json(
        serializeWrongNote(updated, {
          kind: "student",
        }),
      );
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

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    if (!isStudentRole(session.role)) {
      logAccessDenied("student_wrong_note_delete_requires_student_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Student role is required");
    }

    const wrongNoteId = await readWrongNoteId(context);

    if (!wrongNoteId) {
      return apiError(400, "VALIDATION_ERROR", "wrongNote id is required");
    }

    try {
      const student = await assertStudentLoginOwnership({
        loginUserId: session.userId,
      });
      const existing = await prisma.wrongNote.findFirst({
        where: {
          id: wrongNoteId,
          studentId: student.id,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!existing) {
        return apiError(404, "NOT_FOUND", "Wrong note not found");
      }

      await prisma.wrongNote.update({
        where: {
          id: wrongNoteId,
        },
        data: {
          deletedAt: new Date(),
        },
      });

      return new Response(null, {
        status: 204,
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
