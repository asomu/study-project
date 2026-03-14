import { Subject } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isGuardianRole } from "@/modules/auth/roles";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { apiError } from "@/modules/shared/api-error";
import { logAccessDenied, logUnexpectedError } from "@/modules/shared/structured-log";
import { serializeAuthoringConceptLesson } from "@/modules/study/serializers";
import { conceptLessonUpsertSchema } from "@/modules/study/schemas";

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
      logAccessDenied("study_content_upsert_concept_requires_guardian_role", {
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
    const parsed = conceptLessonUpsertSchema.safeParse(payload);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }

    const curriculumNode = await prisma.curriculumNode.findFirst({
      where: {
        id: curriculumNodeId,
        subject: Subject.math,
      },
      select: {
        id: true,
      },
    });

    if (!curriculumNode) {
      return apiError(404, "NOT_FOUND", "Curriculum node not found");
    }

    const lesson = await prisma.conceptLesson.upsert({
      where: {
        curriculumNodeId,
      },
      update: {
        title: parsed.data.title.trim(),
        summary: parsed.data.summary?.trim() ? parsed.data.summary.trim() : null,
        contentJson: parsed.data.content,
      },
      create: {
        curriculumNodeId,
        title: parsed.data.title.trim(),
        summary: parsed.data.summary?.trim() ? parsed.data.summary.trim() : null,
        contentJson: parsed.data.content,
      },
      include: {
        curriculumNode: true,
      },
    });

    return NextResponse.json({ conceptLesson: serializeAuthoringConceptLesson(lesson) });
  } catch (error) {
    logUnexpectedError("study_content_upsert_concept.route_error", error);
    return apiError(500, "INTERNAL_SERVER_ERROR", "Unexpected server error");
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    if (!isGuardianRole(session.role)) {
      logAccessDenied("study_content_delete_concept_requires_guardian_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Guardian role is required");
    }

    const curriculumNodeId = await readCurriculumNodeId(context);

    if (!curriculumNodeId) {
      return apiError(400, "VALIDATION_ERROR", "curriculumNodeId is required");
    }

    const existing = await prisma.conceptLesson.findUnique({
      where: {
        curriculumNodeId,
      },
    });

    if (!existing) {
      return apiError(404, "NOT_FOUND", "Concept lesson not found");
    }

    await prisma.conceptLesson.delete({
      where: {
        curriculumNodeId,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logUnexpectedError("study_content_delete_concept.route_error", error);
    return apiError(500, "INTERNAL_SERVER_ERROR", "Unexpected server error");
  }
}
