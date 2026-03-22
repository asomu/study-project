import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertStudentOwnership, OwnershipError } from "@/modules/auth/ownership-guard";
import { isGuardianRole } from "@/modules/auth/roles";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { apiError } from "@/modules/shared/api-error";
import { logAccessDenied } from "@/modules/shared/structured-log";
import {
  serializeStudentWorkbook,
  serializeStudentWorkbookList,
  studentWorkbookInclude,
} from "@/modules/workbook/serializers";
import { createStudentWorkbookSchema, parseGuardianStudentWorkbookListQuery } from "@/modules/workbook/schemas";
import { serializeWrongNoteStudent } from "@/modules/wrong-note/serializers";

export async function GET(request: Request) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    if (!isGuardianRole(session.role)) {
      logAccessDenied("student_workbooks_read_requires_guardian_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Guardian role is required");
    }

    const requestUrl = new URL(request.url);
    const parsed = parseGuardianStudentWorkbookListQuery(requestUrl);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }

    try {
      const student = await assertStudentOwnership({
        studentId: parsed.data.studentId,
        guardianUserId: session.userId,
      });
      const studentWorkbooks = await prisma.studentWorkbook.findMany({
        where: {
          studentId: student.id,
        },
        include: studentWorkbookInclude,
        orderBy: [
          {
            isArchived: "asc",
          },
          {
            createdAt: "desc",
          },
        ],
      });

      return NextResponse.json(
        serializeStudentWorkbookList({
          student: serializeWrongNoteStudent(student),
          studentWorkbooks: studentWorkbooks.map(serializeStudentWorkbook),
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

export async function POST(request: Request) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    if (!isGuardianRole(session.role)) {
      logAccessDenied("student_workbooks_create_requires_guardian_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Guardian role is required");
    }

    const payload = await request.json().catch(() => null);
    const parsed = createStudentWorkbookSchema.safeParse(payload);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }

    try {
      const student = await assertStudentOwnership({
        studentId: parsed.data.studentId,
        guardianUserId: session.userId,
      });
      const workbookTemplate = await prisma.workbookTemplate.findFirst({
        where: {
          id: parsed.data.workbookTemplateId,
          guardianUserId: session.userId,
        },
        select: {
          id: true,
          schoolLevel: true,
        },
      });

      if (!workbookTemplate) {
        return apiError(404, "NOT_FOUND", "Workbook template not found");
      }

      if (workbookTemplate.schoolLevel !== student.schoolLevel) {
        return apiError(400, "VALIDATION_ERROR", "Workbook template school level does not match the student");
      }

      const existing = await prisma.studentWorkbook.findUnique({
        where: {
          studentId_workbookTemplateId: {
            studentId: student.id,
            workbookTemplateId: workbookTemplate.id,
          },
        },
        select: {
          id: true,
        },
      });

      if (existing) {
        return apiError(409, "CONFLICT", "Workbook template is already assigned to the student");
      }

      const created = await prisma.studentWorkbook.create({
        data: {
          studentId: student.id,
          workbookTemplateId: workbookTemplate.id,
        },
        include: studentWorkbookInclude,
      });

      return NextResponse.json(serializeStudentWorkbook(created), {
        status: 201,
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
