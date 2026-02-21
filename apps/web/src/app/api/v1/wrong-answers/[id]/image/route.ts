import { prisma } from "@/lib/prisma";
import { assertWrongAnswerOwnership, OwnershipError } from "@/modules/auth/ownership-guard";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import {
  allowedImageMimeToExtension,
  getUploadMaxBytes,
  isSupportedImageMime,
  saveWrongAnswerImage,
} from "@/modules/mistake-note/upload";
import { apiError } from "@/modules/shared/api-error";

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

    const wrongAnswerId = await readWrongAnswerId(context);

    if (!wrongAnswerId) {
      return apiError(400, "VALIDATION_ERROR", "wrongAnswer id is required");
    }

    try {
      await assertWrongAnswerOwnership({
        wrongAnswerId,
        guardianUserId: session.userId,
      });

      const formData = await request.formData();
      const fileCandidate = formData.get("file");

      if (!(fileCandidate instanceof File)) {
        return apiError(400, "VALIDATION_ERROR", "file field is required");
      }

      if (!isSupportedImageMime(fileCandidate.type)) {
        return apiError(
          415,
          "UNSUPPORTED_MEDIA_TYPE",
          "Only jpeg, png, and webp images are allowed",
          Object.keys(allowedImageMimeToExtension),
        );
      }

      const maxBytes = getUploadMaxBytes();

      if (fileCandidate.size > maxBytes) {
        return apiError(413, "PAYLOAD_TOO_LARGE", `File exceeds ${maxBytes} bytes limit`);
      }

      const imagePath = await saveWrongAnswerImage(fileCandidate, wrongAnswerId);

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
        return apiError(403, "FORBIDDEN", "Wrong answer ownership verification failed");
      }

      throw error;
    }
  } catch {
    return apiError(500, "INTERNAL_SERVER_ERROR", "Unexpected server error");
  }
}
