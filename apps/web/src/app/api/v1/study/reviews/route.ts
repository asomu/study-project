import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertStudentOwnership, OwnershipError } from "@/modules/auth/ownership-guard";
import { isGuardianRole } from "@/modules/auth/roles";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { apiError } from "@/modules/shared/api-error";
import { logAccessDenied } from "@/modules/shared/structured-log";
import { serializeStudySessionSummary } from "@/modules/study/serializers";
import { parseStudyReviewsQuery } from "@/modules/study/schemas";
import { sortReviewQueue } from "@/modules/study/service";

export async function GET(request: Request) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    if (!isGuardianRole(session.role)) {
      logAccessDenied("study_reviews_requires_guardian_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Guardian role is required");
    }

    const requestUrl = new URL(request.url);
    const parsed = parseStudyReviewsQuery(requestUrl);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }

    try {
      const student = await assertStudentOwnership({
        studentId: parsed.data.studentId,
        guardianUserId: session.userId,
      });

      const attempts = await prisma.attempt.findMany({
        where: {
          studentId: student.id,
          sourceType: "practice",
          submittedAt: {
            not: null,
          },
        },
        orderBy: [{ submittedAt: "desc" }, { startedAt: "desc" }],
        include: {
          practiceSet: {
            include: {
              curriculumNode: true,
            },
          },
          items: true,
          studyReview: true,
          workArtifact: true,
        },
      });

      const queue = sortReviewQueue(
        attempts.map((attempt) => ({
          attemptId: attempt.id,
          submittedAt: attempt.submittedAt ?? attempt.attemptDate,
          wrongItems: attempt.items.filter((item) => !item.isCorrect).length,
          hasReview: Boolean(attempt.studyReview),
        })),
      );

      const attemptsById = new Map(attempts.map((attempt) => [attempt.id, attempt]));

      return NextResponse.json({
        student: {
          id: student.id,
          name: student.name,
          schoolLevel: student.schoolLevel,
          grade: student.grade,
        },
        reviewQueue: queue
          .map((entry) => attemptsById.get(entry.attemptId))
          .filter((attempt): attempt is NonNullable<typeof attempt> => Boolean(attempt))
          .map(serializeStudySessionSummary),
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
