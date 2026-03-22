import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isGuardianRole } from "@/modules/auth/roles";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { apiError } from "@/modules/shared/api-error";
import { logAccessDenied } from "@/modules/shared/structured-log";
import { serializeWorkbookTemplate, workbookTemplateInclude } from "@/modules/workbook/serializers";
import { updateWorkbookTemplateSchema } from "@/modules/workbook/schemas";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

async function readTemplateId(context: RouteContext) {
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
      logAccessDenied("workbook_template_update_requires_guardian_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Guardian role is required");
    }

    const workbookTemplateId = await readTemplateId(context);

    if (!workbookTemplateId) {
      return apiError(400, "VALIDATION_ERROR", "Workbook template id is required");
    }

    const payload = await request.json().catch(() => null);
    const parsed = updateWorkbookTemplateSchema.safeParse(payload);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }

    const existing = await prisma.workbookTemplate.findFirst({
      where: {
        id: workbookTemplateId,
        guardianUserId: session.userId,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return apiError(404, "NOT_FOUND", "Workbook template not found");
    }

    const updated = await prisma.workbookTemplate.update({
      where: {
        id: workbookTemplateId,
      },
      data: {
        ...(parsed.data.title !== undefined ? { title: parsed.data.title.trim() } : {}),
        ...(parsed.data.publisher !== undefined ? { publisher: parsed.data.publisher.trim() } : {}),
        ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
      },
      include: workbookTemplateInclude,
    });

    return NextResponse.json(serializeWorkbookTemplate(updated));
  } catch {
    return apiError(500, "INTERNAL_SERVER_ERROR", "Unexpected server error");
  }
}
