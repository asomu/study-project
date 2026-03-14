import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertStudentLoginOwnership, OwnershipError } from "@/modules/auth/ownership-guard";
import { isStudentRole } from "@/modules/auth/roles";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { serializeWrongAnswer } from "@/modules/mistake-note/serializers";
import { apiError } from "@/modules/shared/api-error";
import { logAccessDenied } from "@/modules/shared/structured-log";
import { updateStudentWrongAnswerSchema } from "@/modules/study/schemas";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

const wrongAnswerInclude = {
  categories: {
    include: {
      category: true,
    },
  },
  attemptItem: {
    include: {
      attempt: true,
    },
  },
} as const;

async function readWrongAnswerId(context: RouteContext) {
  const params = await context.params;
  return params.id;
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    if (!isStudentRole(session.role)) {
      logAccessDenied("student_wrong_answer_update_requires_student_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Student role is required");
    }

    const wrongAnswerId = await readWrongAnswerId(context);

    if (!wrongAnswerId) {
      return apiError(400, "VALIDATION_ERROR", "wrongAnswer id is required");
    }

    const payload = await request.json().catch(() => null);
    const parsed = updateStudentWrongAnswerSchema.safeParse(payload);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
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
        include: wrongAnswerInclude,
      });

      if (!wrongAnswer) {
        return apiError(404, "NOT_FOUND", "Wrong answer not found");
      }

      const dedupedKeys = parsed.data.categoryKeys
        ? [...new Set(parsed.data.categoryKeys.map((key) => key.trim()))]
        : undefined;

      if (dedupedKeys && dedupedKeys.length !== parsed.data.categoryKeys?.length) {
        return apiError(400, "VALIDATION_ERROR", "Duplicate category keys are not allowed");
      }

      const categories =
        dedupedKeys && dedupedKeys.length
          ? await prisma.wrongAnswerCategory.findMany({
              where: {
                key: {
                  in: dedupedKeys,
                },
              },
              select: {
                id: true,
                key: true,
              },
            })
          : [];

      if (dedupedKeys && categories.length !== dedupedKeys.length) {
        const foundKeys = new Set(categories.map((category) => category.key));
        const missingKeys = dedupedKeys.filter((key) => !foundKeys.has(key));

        return apiError(400, "VALIDATION_ERROR", "Unknown category keys", missingKeys);
      }

      const updated = await prisma.$transaction(async (tx) => {
        await tx.wrongAnswer.update({
          where: {
            id: wrongAnswerId,
          },
          data: {
            memo:
              parsed.data.memo === undefined ? wrongAnswer.memo : parsed.data.memo.trim() ? parsed.data.memo.trim() : null,
          },
        });

        if (dedupedKeys) {
          await tx.wrongAnswerCategoryMap.deleteMany({
            where: {
              wrongAnswerId,
            },
          });

          if (categories.length) {
            await tx.wrongAnswerCategoryMap.createMany({
              data: categories.map((category) => ({
                wrongAnswerId,
                categoryId: category.id,
              })),
            });
          }
        }

        return tx.wrongAnswer.findUnique({
          where: {
            id: wrongAnswerId,
          },
          include: wrongAnswerInclude,
        });
      });

      if (!updated) {
        return apiError(404, "NOT_FOUND", "Wrong answer not found");
      }

      return NextResponse.json(serializeWrongAnswer(updated));
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
