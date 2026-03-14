import { prisma } from "@/lib/prisma";
import { assertStudentLoginOwnership, OwnershipError } from "@/modules/auth/ownership-guard";
import { isStudentRole } from "@/modules/auth/roles";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import {
  allowedImageMimeToExtension,
  getUploadMaxBytes,
  hasValidImageSignature,
  isSupportedImageMime,
  saveWrongAnswerImage,
} from "@/modules/mistake-note/upload";
import { apiError } from "@/modules/shared/api-error";
import { logAccessDenied, logUploadFailure } from "@/modules/shared/structured-log";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

async function readWrongAnswerId(context: RouteContext) {
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
      logAccessDenied("student_wrong_answer_image_requires_student_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Student role is required");
    }

    const wrongAnswerId = await readWrongAnswerId(context);

    if (!wrongAnswerId) {
      return apiError(400, "VALIDATION_ERROR", "wrongAnswer id is required");
    }

    try {
      const student = await assertStudentLoginOwnership({
        loginUserId: session.userId,
      });
      const wrongAnswer = await prisma.wrongAnswer.findFirst({
        where: {
          id: wrongAnswerId,
          attemptItem: {
            attempt: {
              studentId: student.id,
            },
          },
        },
        select: {
          id: true,
        },
      });

      if (!wrongAnswer) {
        return apiError(404, "NOT_FOUND", "Wrong answer not found");
      }

      const formData = await request.formData();
      const fileCandidate = formData.get("file");

      if (!(fileCandidate instanceof File)) {
        logUploadFailure("missing_file", {
          wrongAnswerId,
        });
        return apiError(400, "VALIDATION_ERROR", "file field is required");
      }

      if (!isSupportedImageMime(fileCandidate.type)) {
        logUploadFailure("unsupported_mime_type", {
          wrongAnswerId,
          mimeType: fileCandidate.type,
        });
        return apiError(
          415,
          "UNSUPPORTED_MEDIA_TYPE",
          "Only jpeg, png, and webp images are allowed",
          Object.keys(allowedImageMimeToExtension),
        );
      }

      const maxBytes = getUploadMaxBytes();

      if (fileCandidate.size > maxBytes) {
        logUploadFailure("payload_too_large", {
          wrongAnswerId,
          mimeType: fileCandidate.type,
          size: fileCandidate.size,
          maxBytes,
        });
        return apiError(413, "PAYLOAD_TOO_LARGE", `File exceeds ${maxBytes} bytes limit`);
      }

      const fileBuffer = Buffer.from(await fileCandidate.arrayBuffer());

      if (!hasValidImageSignature(fileCandidate.type, fileBuffer)) {
        logUploadFailure("invalid_file_signature", {
          wrongAnswerId,
          mimeType: fileCandidate.type,
          size: fileCandidate.size,
        });
        return apiError(415, "UNSUPPORTED_MEDIA_TYPE", "File signature does not match declared image type");
      }

      const imagePath = await saveWrongAnswerImage(fileBuffer, fileCandidate.type, wrongAnswerId);

      await prisma.wrongAnswer.update({
        where: {
          id: wrongAnswerId,
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
