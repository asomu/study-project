import { prisma } from "@/lib/prisma";
import { assertStudentLoginOwnership, OwnershipError } from "@/modules/auth/ownership-guard";
import { isStudentRole } from "@/modules/auth/roles";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import {
  allowedImageMimeToExtension,
  getUploadMaxBytes,
  hasValidImageSignature,
  isSupportedImageMime,
  saveWrongNoteImage,
  supportedImageMimeDescription,
} from "@/modules/mistake-note/upload";
import { apiError } from "@/modules/shared/api-error";
import { logAccessDenied, logUploadFailure } from "@/modules/shared/structured-log";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

async function readWrongNoteId(context: RouteContext) {
  const params = await context.params;
  return params.id;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    if (!isStudentRole(session.role)) {
      logAccessDenied("student_wrong_note_image_requires_student_role", {
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
        select: {
          id: true,
        },
      });

      if (!wrongNote) {
        return apiError(404, "NOT_FOUND", "Wrong note not found");
      }

      const formData = await request.formData();
      const fileCandidate = formData.get("file");

      if (!(fileCandidate instanceof File)) {
        logUploadFailure("wrong_note_image_missing_file", {
          wrongNoteId,
        });
        return apiError(400, "VALIDATION_ERROR", "file field is required");
      }

      if (!isSupportedImageMime(fileCandidate.type)) {
        logUploadFailure("wrong_note_image_unsupported_mime_type", {
          wrongNoteId,
          mimeType: fileCandidate.type,
        });
        return apiError(
          415,
          "UNSUPPORTED_MEDIA_TYPE",
          `Only ${supportedImageMimeDescription} images are allowed`,
          Object.keys(allowedImageMimeToExtension),
        );
      }

      const maxBytes = getUploadMaxBytes();

      if (fileCandidate.size > maxBytes) {
        logUploadFailure("wrong_note_image_payload_too_large", {
          wrongNoteId,
          mimeType: fileCandidate.type,
          size: fileCandidate.size,
          maxBytes,
        });
        return apiError(413, "PAYLOAD_TOO_LARGE", `File exceeds ${maxBytes} bytes limit`);
      }

      const fileBuffer = Buffer.from(await fileCandidate.arrayBuffer());

      if (!hasValidImageSignature(fileCandidate.type, fileBuffer)) {
        logUploadFailure("wrong_note_image_invalid_file_signature", {
          wrongNoteId,
          mimeType: fileCandidate.type,
          size: fileCandidate.size,
        });
        return apiError(415, "UNSUPPORTED_MEDIA_TYPE", "File signature does not match declared image type");
      }

      const imagePath = await saveWrongNoteImage(fileBuffer, fileCandidate.type, wrongNoteId);

      await prisma.wrongNote.update({
        where: {
          id: wrongNoteId,
        },
        data: {
          imagePath,
        },
      });

      return Response.json({ imagePath });
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
