import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isGuardianRole } from "@/modules/auth/roles";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { apiError } from "@/modules/shared/api-error";
import { logAccessDenied } from "@/modules/shared/structured-log";
import {
  serializeWorkbookTemplate,
  serializeWorkbookTemplateList,
  workbookTemplateInclude,
} from "@/modules/workbook/serializers";
import { createWorkbookTemplateSchema } from "@/modules/workbook/schemas";
import { normalizeWorkbookStages, validateWorkbookStageNames } from "@/modules/workbook/service";
import { isGradeAllowedForSchoolLevel } from "@/modules/wrong-note/constants";

export async function GET(request: Request) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    if (!isGuardianRole(session.role)) {
      logAccessDenied("workbook_templates_read_requires_guardian_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Guardian role is required");
    }

    const workbookTemplates = await prisma.workbookTemplate.findMany({
      where: {
        guardianUserId: session.userId,
      },
      include: workbookTemplateInclude,
      orderBy: [
        {
          isActive: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

    return NextResponse.json(
      serializeWorkbookTemplateList({
        workbookTemplates: workbookTemplates.map(serializeWorkbookTemplate),
      }),
    );
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
      logAccessDenied("workbook_templates_create_requires_guardian_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Guardian role is required");
    }

    const payload = await request.json().catch(() => null);
    const parsed = createWorkbookTemplateSchema.safeParse(payload);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }

    if (!isGradeAllowedForSchoolLevel(parsed.data.schoolLevel, parsed.data.grade)) {
      return apiError(400, "VALIDATION_ERROR", "grade is not available for the selected school level");
    }

    const stages = normalizeWorkbookStages(parsed.data.stages);

    if (!validateWorkbookStageNames(stages)) {
      return apiError(400, "VALIDATION_ERROR", "Workbook stages must have unique names");
    }

    const created = await prisma.workbookTemplate.create({
      data: {
        guardianUserId: session.userId,
        title: parsed.data.title.trim(),
        publisher: parsed.data.publisher.trim(),
        schoolLevel: parsed.data.schoolLevel,
        grade: parsed.data.grade,
        semester: parsed.data.semester,
        stages: {
          create: stages.map((stage) => ({
            name: stage.name,
            sortOrder: stage.sortOrder,
          })),
        },
      },
      include: workbookTemplateInclude,
    });

    return NextResponse.json(serializeWorkbookTemplate(created), {
      status: 201,
    });
  } catch {
    return apiError(500, "INTERNAL_SERVER_ERROR", "Unexpected server error");
  }
}
