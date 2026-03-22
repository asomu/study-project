import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isGuardianRole } from "@/modules/auth/roles";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { apiError } from "@/modules/shared/api-error";
import { logAccessDenied } from "@/modules/shared/structured-log";
import { serializeWrongNote, wrongNoteInclude } from "@/modules/wrong-note/serializers";
import { normalizeOptionalText } from "@/modules/wrong-note/service";
import { wrongNoteFeedbackSchema } from "@/modules/wrong-note/schemas";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

async function readWrongNoteId(context: RouteContext) {
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
      logAccessDenied("guardian_wrong_note_feedback_requires_guardian_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Guardian role is required");
    }

    const wrongNoteId = await readWrongNoteId(context);

    if (!wrongNoteId) {
      return apiError(400, "VALIDATION_ERROR", "wrongNote id is required");
    }

    const payload = await request.json().catch(() => null);
    const parsed = wrongNoteFeedbackSchema.safeParse(payload);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }

    const existing = await prisma.wrongNote.findFirst({
      where: {
        id: wrongNoteId,
        deletedAt: null,
        student: {
          guardianUserId: session.userId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return apiError(404, "NOT_FOUND", "Wrong note not found");
    }

    const normalizedText = normalizeOptionalText(parsed.data.text);
    const updated = await prisma.wrongNote.update({
      where: {
        id: wrongNoteId,
      },
      data: {
        guardianFeedback: normalizedText,
        guardianFeedbackAt: normalizedText ? new Date() : null,
        guardianFeedbackByUserId: normalizedText ? session.userId : null,
      },
      include: wrongNoteInclude,
    });

    return NextResponse.json(
      serializeWrongNote(updated, {
        kind: "guardian",
        studentId: updated.student.id,
      }),
    );
  } catch {
    return apiError(500, "INTERNAL_SERVER_ERROR", "Unexpected server error");
  }
}
