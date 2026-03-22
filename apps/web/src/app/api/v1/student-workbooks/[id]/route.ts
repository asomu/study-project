import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isGuardianRole } from "@/modules/auth/roles";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { apiError } from "@/modules/shared/api-error";
import { logAccessDenied } from "@/modules/shared/structured-log";
import { serializeStudentWorkbook, studentWorkbookInclude } from "@/modules/workbook/serializers";
import { updateStudentWorkbookSchema } from "@/modules/workbook/schemas";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

async function readStudentWorkbookId(context: RouteContext) {
  const params = await context.params;
  return params.id;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    if (!isGuardianRole(session.role)) {
      logAccessDenied("student_workbook_update_requires_guardian_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Guardian role is required");
    }

    const studentWorkbookId = await readStudentWorkbookId(context);

    if (!studentWorkbookId) {
      return apiError(400, "VALIDATION_ERROR", "Student workbook id is required");
    }

    const payload = await request.json().catch(() => null);
    const parsed = updateStudentWorkbookSchema.safeParse(payload);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }

    const existing = await prisma.studentWorkbook.findFirst({
      where: {
        id: studentWorkbookId,
        student: {
          guardianUserId: session.userId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return apiError(404, "NOT_FOUND", "Student workbook not found");
    }

    const updated = await prisma.studentWorkbook.update({
      where: {
        id: studentWorkbookId,
      },
      data: {
        isArchived: parsed.data.isArchived,
      },
      include: studentWorkbookInclude,
    });

    return NextResponse.json(serializeStudentWorkbook(updated));
  } catch {
    return apiError(500, "INTERNAL_SERVER_ERROR", "Unexpected server error");
  }
}
