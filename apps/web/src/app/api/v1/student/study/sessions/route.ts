import { Subject } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertStudentLoginOwnership, OwnershipError } from "@/modules/auth/ownership-guard";
import { isStudentRole } from "@/modules/auth/roles";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { apiError } from "@/modules/shared/api-error";
import { logAccessDenied } from "@/modules/shared/structured-log";
import { serializePracticeProblem, serializeStudySessionSummary } from "@/modules/study/serializers";
import { createStudySessionSchema } from "@/modules/study/schemas";
import { ensurePracticeMaterial, getCurrentSemester } from "@/modules/study/service";

async function loadPracticeSessionPayload(studentId: string, attemptId?: string) {
  const where = attemptId
    ? {
        id: attemptId,
      }
    : {
        studentId,
        sourceType: "practice" as const,
        submittedAt: null,
      };

  return prisma.attempt.findFirst({
    where,
    orderBy: attemptId ? undefined : [{ startedAt: "desc" }, { createdAt: "desc" }],
    include: {
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
      items: true,
      studyReview: true,
      workArtifact: true,
    },
  });
}

export async function GET(request: Request) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    if (!isStudentRole(session.role)) {
      logAccessDenied("student_study_sessions_requires_student_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Student role is required");
    }

    try {
      const student = await assertStudentLoginOwnership({
        loginUserId: session.userId,
      });
      const attempts = await prisma.attempt.findMany({
        where: {
          studentId: student.id,
          sourceType: "practice",
        },
        orderBy: [{ submittedAt: "desc" }, { startedAt: "desc" }],
        take: 20,
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

      return NextResponse.json({
        sessions: attempts.map(serializeStudySessionSummary),
      });
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

export async function POST(request: Request) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    if (!isStudentRole(session.role)) {
      logAccessDenied("student_study_sessions_requires_student_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Student role is required");
    }

    const payload = await request.json().catch(() => null);
    const parsed = createStudySessionSchema.safeParse(payload);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }

    try {
      const student = await assertStudentLoginOwnership({
        loginUserId: session.userId,
      });
      const currentSemester = getCurrentSemester(new Date());
      const practiceSet = await prisma.practiceSet.findFirst({
        where: {
          id: parsed.data.practiceSetId,
          schoolLevel: student.schoolLevel,
          subject: Subject.math,
          grade: student.grade,
          semester: currentSemester,
          isActive: true,
        },
        include: {
          curriculumNode: true,
          problems: {
            orderBy: {
              problemNo: "asc",
            },
          },
        },
      });

      if (!practiceSet) {
        return apiError(404, "NOT_FOUND", "Practice set not found");
      }

      const existing = await prisma.attempt.findFirst({
        where: {
          studentId: student.id,
          practiceSetId: practiceSet.id,
          sourceType: "practice",
          submittedAt: null,
        },
        orderBy: {
          startedAt: "desc",
        },
      });

      const attemptId = existing
        ? existing.id
        : (
            await prisma.$transaction(async (tx) => {
              const material = await ensurePracticeMaterial(tx, student, practiceSet);
              const attempt = await tx.attempt.create({
                data: {
                  studentId: student.id,
                  materialId: material.id,
                  attemptDate: new Date(),
                  sourceType: "practice",
                  startedAt: new Date(),
                  practiceSetId: practiceSet.id,
                },
              });

              return attempt.id;
            })
          );

      const studySession = await loadPracticeSessionPayload(student.id, attemptId);

      if (!studySession || !studySession.practiceSet) {
        return apiError(500, "INTERNAL_SERVER_ERROR", "Study session could not be initialized");
      }

      return NextResponse.json(
        {
          session: {
            ...serializeStudySessionSummary(studySession),
            practiceSet: {
              id: studySession.practiceSet.id,
              title: studySession.practiceSet.title,
              description: studySession.practiceSet.description,
              curriculumNodeId: studySession.practiceSet.curriculumNodeId,
              unitName: studySession.practiceSet.curriculumNode.unitName,
              problems: studySession.practiceSet.problems.map(serializePracticeProblem),
            },
          },
        },
        { status: existing ? 200 : 201 },
      );
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
