import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isGuardianRole } from "@/modules/auth/roles";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { apiError } from "@/modules/shared/api-error";
import { logAccessDenied } from "@/modules/shared/structured-log";
import {
  serializeWorkbookProgressRow,
  studentWorkbookInclude,
} from "@/modules/workbook/serializers";
import { updateWorkbookProgressSchema } from "@/modules/workbook/schemas";
import { buildWorkbookProgressRowPayload, getWorkbookCurriculumNodeWhere } from "@/modules/workbook/service";

export async function PUT(request: Request) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    if (!isGuardianRole(session.role)) {
      logAccessDenied("guardian_workbook_progress_update_requires_guardian_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Guardian role is required");
    }

    const payload = await request.json().catch(() => null);
    const parsed = updateWorkbookProgressSchema.safeParse(payload);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }

    const studentWorkbook = await prisma.studentWorkbook.findFirst({
      where: {
        id: parsed.data.studentWorkbookId,
        isArchived: false,
        student: {
          guardianUserId: session.userId,
        },
        workbookTemplate: {
          isActive: true,
        },
      },
      include: studentWorkbookInclude,
    });

    if (!studentWorkbook) {
      return apiError(404, "NOT_FOUND", "Student workbook not found");
    }

    const stage = studentWorkbook.workbookTemplate.stages.find((item) => item.id === parsed.data.workbookTemplateStageId);

    if (!stage) {
      return apiError(400, "VALIDATION_ERROR", "Stage does not belong to the selected workbook");
    }

    const curriculumNode = await prisma.curriculumNode.findFirst({
      where: {
        ...getWorkbookCurriculumNodeWhere({
          schoolLevel: studentWorkbook.workbookTemplate.schoolLevel,
          grade: studentWorkbook.workbookTemplate.grade,
          semester: studentWorkbook.workbookTemplate.semester,
        }),
        id: parsed.data.curriculumNodeId,
      },
      select: {
        id: true,
        unitName: true,
        unitCode: true,
        sortOrder: true,
      },
    });

    if (!curriculumNode) {
      return apiError(400, "VALIDATION_ERROR", "Unit does not belong to the selected workbook");
    }

    await prisma.studentWorkbookProgress.upsert({
      where: {
        studentWorkbookId_curriculumNodeId_workbookTemplateStageId: {
          studentWorkbookId: studentWorkbook.id,
          curriculumNodeId: curriculumNode.id,
          workbookTemplateStageId: stage.id,
        },
      },
      create: {
        studentWorkbookId: studentWorkbook.id,
        curriculumNodeId: curriculumNode.id,
        workbookTemplateStageId: stage.id,
        status: parsed.data.status,
        updatedByUserId: session.userId,
        lastUpdatedAt: new Date(),
      },
      update: {
        status: parsed.data.status,
        updatedByUserId: session.userId,
        lastUpdatedAt: new Date(),
      },
    });

    const progressRecords = await prisma.studentWorkbookProgress.findMany({
      where: {
        studentWorkbookId: studentWorkbook.id,
        curriculumNodeId: curriculumNode.id,
      },
      select: {
        curriculumNodeId: true,
        workbookTemplateStageId: true,
        status: true,
        lastUpdatedAt: true,
      },
    });

    return NextResponse.json(
      serializeWorkbookProgressRow(
        buildWorkbookProgressRowPayload({
          selectedWorkbook: studentWorkbook,
          node: curriculumNode,
          progressRecords,
        }),
      ),
    );
  } catch {
    return apiError(500, "INTERNAL_SERVER_ERROR", "Unexpected server error");
  }
}
