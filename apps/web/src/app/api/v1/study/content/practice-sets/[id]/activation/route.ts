import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isGuardianRole } from "@/modules/auth/roles";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { apiError } from "@/modules/shared/api-error";
import { logAccessDenied, logUnexpectedError } from "@/modules/shared/structured-log";
import { serializeAuthoringPracticeSet } from "@/modules/study/serializers";
import { practiceSetActivationSchema } from "@/modules/study/schemas";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

async function readPracticeSetId(context: RouteContext) {
  const params = await context.params;
  return params.id;
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    if (!isGuardianRole(session.role)) {
      logAccessDenied("study_content_toggle_practice_set_requires_guardian_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Guardian role is required");
    }

    const practiceSetId = await readPracticeSetId(context);

    if (!practiceSetId) {
      return apiError(400, "VALIDATION_ERROR", "practiceSetId is required");
    }

    const payload = await request.json().catch(() => null);
    const parsed = practiceSetActivationSchema.safeParse(payload);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }

    const existing = await prisma.practiceSet.findUnique({
      where: {
        id: practiceSetId,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return apiError(404, "NOT_FOUND", "Practice set not found");
    }

    const updated = await prisma.practiceSet.update({
      where: {
        id: practiceSetId,
      },
      data: {
        isActive: parsed.data.isActive,
      },
      include: {
        curriculumNode: true,
        problems: {
          orderBy: {
            problemNo: "asc",
          },
        },
        _count: {
          select: {
            attempts: true,
          },
        },
      },
    });

    return NextResponse.json({ practiceSet: serializeAuthoringPracticeSet(updated) });
  } catch (error) {
    logUnexpectedError("study_content_toggle_practice_set.route_error", error);
    return apiError(500, "INTERNAL_SERVER_ERROR", "Unexpected server error");
  }
}
