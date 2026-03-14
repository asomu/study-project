import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OwnershipError } from "@/modules/auth/ownership-guard";
import { isGuardianRole } from "@/modules/auth/roles";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { apiError } from "@/modules/shared/api-error";
import { logAccessDenied, logUnexpectedError } from "@/modules/shared/structured-log";
import { createStudyReviewSchema } from "@/modules/study/schemas";
import { isValidProgressTransition } from "@/modules/study/service";

type RouteContext = {
  params: Promise<{ sessionId: string }> | { sessionId: string };
};

async function readSessionId(context: RouteContext) {
  const params = await context.params;
  return params.sessionId;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    if (!isGuardianRole(session.role)) {
      logAccessDenied("study_review_write_requires_guardian_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Guardian role is required");
    }

    const reviewTargetId = await readSessionId(context);

    if (!reviewTargetId) {
      return apiError(400, "VALIDATION_ERROR", "sessionId is required");
    }

    const payload = await request.json().catch(() => null);
    const parsed = createStudyReviewSchema.safeParse(payload);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }

    try {
      const attempt = await prisma.attempt.findFirst({
        where: {
          id: reviewTargetId,
          sourceType: "practice",
          student: {
            guardianUserId: session.userId,
          },
        },
        include: {
          student: true,
          practiceSet: true,
          items: true,
          studyReview: true,
        },
      });

      if (!attempt || !attempt.practiceSet) {
        throw new OwnershipError("Study session does not belong to authenticated guardian");
      }

      if (!attempt.submittedAt) {
        return apiError(400, "VALIDATION_ERROR", "Only submitted study sessions can be reviewed");
      }

      const reviewedAt = new Date();
      const progress = await prisma.studentUnitProgress.findUnique({
        where: {
          studentId_curriculumNodeId: {
            studentId: attempt.studentId,
            curriculumNodeId: attempt.practiceSet.curriculumNodeId,
          },
        },
      });

      if (!isValidProgressTransition(progress?.status ?? null, parsed.data.progressStatus)) {
        return apiError(409, "CONFLICT", "Study progress transition is not allowed");
      }

      const updated = await prisma.$transaction(async (tx) => {
        const review = await tx.studyReview.upsert({
          where: {
            attemptId: attempt.id,
          },
          update: {
            feedback: parsed.data.feedback,
            progressStatus: parsed.data.progressStatus,
            reviewedAt,
            guardianUserId: session.userId,
          },
          create: {
            attemptId: attempt.id,
            studentId: attempt.studentId,
            guardianUserId: session.userId,
            feedback: parsed.data.feedback,
            progressStatus: parsed.data.progressStatus,
            reviewedAt,
          },
        });

        await tx.studentUnitProgress.upsert({
          where: {
            studentId_curriculumNodeId: {
              studentId: attempt.studentId,
              curriculumNodeId: attempt.practiceSet!.curriculumNodeId,
            },
          },
          update: {
            status: parsed.data.progressStatus,
            note: parsed.data.feedback.slice(0, 500),
            reviewedAt,
            updatedByGuardianUserId: session.userId,
          },
          create: {
            studentId: attempt.studentId,
            curriculumNodeId: attempt.practiceSet!.curriculumNodeId,
            status: parsed.data.progressStatus,
            note: parsed.data.feedback.slice(0, 500),
            reviewedAt,
            updatedByGuardianUserId: session.userId,
          },
        });

        await tx.wrongAnswer.updateMany({
          where: {
            attemptItem: {
              attemptId: attempt.id,
            },
          },
          data: {
            reviewedAt,
          },
        });

        return review;
      });

      return NextResponse.json({
        review: updated,
      });
    } catch (error) {
      if (error instanceof OwnershipError) {
        return apiError(403, "FORBIDDEN", "Study session ownership verification failed");
      }

      logUnexpectedError("study_review_write.unexpected_error", error, {
        reviewTargetId,
      });
      throw error;
    }
  } catch (error) {
    logUnexpectedError("study_review_write.route_error", error);
    return apiError(500, "INTERNAL_SERVER_ERROR", "Unexpected server error");
  }
}
