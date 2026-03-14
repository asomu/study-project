import { StudyProgressStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertStudentLoginOwnership, OwnershipError } from "@/modules/auth/ownership-guard";
import { isStudentRole } from "@/modules/auth/roles";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { apiError } from "@/modules/shared/api-error";
import { logAccessDenied, logUnexpectedError } from "@/modules/shared/structured-log";
import { serializeStudySessionSummary } from "@/modules/study/serializers";
import { submitStudySessionSchema } from "@/modules/study/schemas";
import {
  gradePracticeSubmission,
  isValidProgressTransition,
  normalizeElapsedSeconds,
  saveStudyCanvasArtifact,
} from "@/modules/study/service";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

async function readSessionId(context: RouteContext) {
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
      logAccessDenied("student_study_submit_requires_student_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Student role is required");
    }

    const sessionId = await readSessionId(context);

    if (!sessionId) {
      return apiError(400, "VALIDATION_ERROR", "session id is required");
    }

    const payload = await request.json().catch(() => null);
    const parsed = submitStudySessionSchema.safeParse(payload);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }

    try {
      const student = await assertStudentLoginOwnership({
        loginUserId: session.userId,
      });
      const studySession = await prisma.attempt.findFirst({
        where: {
          id: sessionId,
          studentId: student.id,
          sourceType: "practice",
        },
        include: {
          items: true,
          practiceSet: {
            include: {
              curriculumNode: true,
              problems: {
                orderBy: {
                  problemNo: "asc",
                },
              },
            },
          },
          studyReview: true,
          workArtifact: true,
        },
      });

      if (!studySession || !studySession.practiceSet) {
        return apiError(404, "NOT_FOUND", "Study session not found");
      }

      if (studySession.submittedAt) {
        return apiError(409, "CONFLICT", "Study session is already submitted");
      }

      if (studySession.items.length > 0) {
        return apiError(409, "CONFLICT", "Study session already has submitted items");
      }

      const validProblemIds = new Set(studySession.practiceSet.problems.map((problem) => problem.id));
      const invalidProblemIds = parsed.data.answers
        .map((entry) => entry.practiceProblemId)
        .filter((practiceProblemId) => !validProblemIds.has(practiceProblemId));

      if (invalidProblemIds.length) {
        return apiError(400, "VALIDATION_ERROR", "Unknown practiceProblemId values", invalidProblemIds);
      }

      const canvasImagePath =
        parsed.data.canvasImageDataUrl === undefined
          ? null
          : await saveStudyCanvasArtifact(sessionId, parsed.data.canvasImageDataUrl);

      if (parsed.data.canvasImageDataUrl && !canvasImagePath) {
        return apiError(400, "VALIDATION_ERROR", "canvasImageDataUrl must be a valid PNG data URL");
      }

      const submittedAt = new Date();
      const graded = gradePracticeSubmission(studySession.practiceSet.problems, parsed.data.answers);
      const nextProgressStatus =
        graded.wrongItems > 0 ? StudyProgressStatus.review_needed : StudyProgressStatus.completed;

      const saved = await prisma.$transaction(async (tx) => {
        const currentProgress = await tx.studentUnitProgress.findUnique({
          where: {
            studentId_curriculumNodeId: {
              studentId: student.id,
              curriculumNodeId: studySession.practiceSet!.curriculumNodeId,
            },
          },
        });

        if (!isValidProgressTransition(currentProgress?.status ?? null, nextProgressStatus)) {
          throw new Error("INVALID_PROGRESS_TRANSITION");
        }

        await tx.attempt.update({
          where: {
            id: studySession.id,
          },
          data: {
            submittedAt,
            elapsedSeconds: normalizeElapsedSeconds(parsed.data.elapsedSeconds, studySession.startedAt, submittedAt),
          },
        });

        for (const gradedItem of graded.gradedItems) {
          const attemptItem = await tx.attemptItem.create({
            data: {
              attemptId: studySession.id,
              curriculumNodeId: gradedItem.curriculumNodeId,
              practiceProblemId: gradedItem.practiceProblemId,
              problemNo: gradedItem.problemNo,
              isCorrect: gradedItem.isCorrect,
              difficulty: gradedItem.difficulty,
              studentAnswer: gradedItem.studentAnswer || null,
            },
          });

          if (!gradedItem.isCorrect) {
            await tx.wrongAnswer.create({
              data: {
                attemptItemId: attemptItem.id,
              },
            });
          }
        }

        if (canvasImagePath) {
          await tx.studyWorkArtifact.upsert({
            where: {
              attemptId: studySession.id,
            },
            update: {
              imagePath: canvasImagePath,
            },
            create: {
              attemptId: studySession.id,
              imagePath: canvasImagePath,
            },
          });
        }

        await tx.studentUnitProgress.upsert({
          where: {
            studentId_curriculumNodeId: {
              studentId: student.id,
              curriculumNodeId: studySession.practiceSet!.curriculumNodeId,
            },
          },
          update: {
            status: nextProgressStatus,
            lastStudiedAt: submittedAt,
          },
          create: {
            studentId: student.id,
            curriculumNodeId: studySession.practiceSet!.curriculumNodeId,
            status: nextProgressStatus,
            lastStudiedAt: submittedAt,
          },
        });

        return tx.attempt.findUnique({
          where: {
            id: studySession.id,
          },
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
      });

      if (!saved) {
        return apiError(500, "INTERNAL_SERVER_ERROR", "Study session could not be saved");
      }

      return NextResponse.json({
        session: serializeStudySessionSummary(saved),
        result: {
          totalProblems: graded.totalProblems,
          correctItems: graded.correctItems,
          wrongItems: graded.wrongItems,
          progressStatus: nextProgressStatus,
        },
      });
    } catch (error) {
      if (error instanceof OwnershipError) {
        return apiError(403, "FORBIDDEN", "Student profile linkage verification failed");
      }

      if (error instanceof Error && error.message === "INVALID_PROGRESS_TRANSITION") {
        return apiError(409, "CONFLICT", "Study progress transition is not allowed");
      }

      logUnexpectedError("student_study_submit.unexpected_error", error, {
        sessionId,
      });
      throw error;
    }
  } catch (error) {
    logUnexpectedError("student_study_submit.route_error", error);
    return apiError(500, "INTERNAL_SERVER_ERROR", "Unexpected server error");
  }
}
