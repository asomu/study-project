import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertStudentLoginOwnership, OwnershipError } from "@/modules/auth/ownership-guard";
import { isStudentRole } from "@/modules/auth/roles";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { apiError } from "@/modules/shared/api-error";
import { logAccessDenied } from "@/modules/shared/structured-log";
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

      return NextResponse.json(serializeWrongNote(wrongNote));
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
      });

      if (!existing) {
        return apiError(404, "NOT_FOUND", "Wrong note not found");
      }

      if (parsed.data.curriculumNodeId && parsed.data.semester) {
        const curriculumNode = await prisma.curriculumNode.findFirst({
          where: getWrongNoteCurriculumNodeWhere({
            student: {
              schoolLevel: student.schoolLevel,
              grade: student.grade,
            },
            curriculumNodeId: parsed.data.curriculumNodeId,
            semester: parsed.data.semester,
          }),
        });

        if (!curriculumNode) {
          return apiError(400, "VALIDATION_ERROR", "curriculumNodeId is not available for the student and semester");
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
        },
        include: wrongNoteInclude,
      });

      return NextResponse.json(serializeWrongNote(updated));
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
