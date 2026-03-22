import { prisma } from "@/lib/prisma";
import { assertStudentOwnership, OwnershipError } from "@/modules/auth/ownership-guard";
import { isGuardianRole } from "@/modules/auth/roles";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { readWrongNoteImageFile } from "@/modules/mistake-note/upload";
import { apiError } from "@/modules/shared/api-error";
import { logAccessDenied } from "@/modules/shared/structured-log";
import { parseGuardianWrongNoteDetailQuery } from "@/modules/wrong-note/schemas";

export const runtime = "nodejs";

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

    if (!isGuardianRole(session.role)) {
      logAccessDenied("guardian_wrong_note_image_requires_guardian_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Guardian role is required");
    }

    const wrongNoteId = await readWrongNoteId(context);

    if (!wrongNoteId) {
      return apiError(400, "VALIDATION_ERROR", "wrongNote id is required");
    }

    const requestUrl = new URL(request.url);
    const parsed = parseGuardianWrongNoteDetailQuery(requestUrl);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }

    try {
      await assertStudentOwnership({
        studentId: parsed.data.studentId,
        guardianUserId: session.userId,
      });
      const wrongNote = await prisma.wrongNote.findFirst({
        where: {
          id: wrongNoteId,
          studentId: parsed.data.studentId,
          deletedAt: null,
        },
        select: {
          imagePath: true,
        },
      });

      if (!wrongNote) {
        return apiError(404, "NOT_FOUND", "Wrong note not found");
      }

      const file = await readWrongNoteImageFile(wrongNote.imagePath);

      if (!file) {
        return apiError(404, "NOT_FOUND", "Wrong note image not found");
      }

      return new Response(file.buffer, {
        headers: {
          "content-type": file.contentType,
          "cache-control": "private, no-store",
        },
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
