import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertWrongAnswerOwnership, OwnershipError } from "@/modules/auth/ownership-guard";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { serializeWrongAnswer } from "@/modules/mistake-note/serializers";
import { updateWrongAnswerCategoriesSchema } from "@/modules/mistake-note/schemas";
import { apiError } from "@/modules/shared/api-error";

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

    const wrongAnswerId = await readWrongAnswerId(context);

    if (!wrongAnswerId) {
      return apiError(400, "VALIDATION_ERROR", "wrongAnswer id is required");
    }

    const payload = await request.json().catch(() => null);
    const parsed = updateWrongAnswerCategoriesSchema.safeParse(payload);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }

    const dedupedKeys = [...new Set(parsed.data.categoryKeys.map((key) => key.trim()))];

    if (dedupedKeys.length !== parsed.data.categoryKeys.length) {
      return apiError(400, "VALIDATION_ERROR", "Duplicate category keys are not allowed");
    }

    try {
      await assertWrongAnswerOwnership({
        wrongAnswerId,
        guardianUserId: session.userId,
      });

      const categories = await prisma.wrongAnswerCategory.findMany({
        where: {
          key: {
            in: dedupedKeys,
          },
        },
        select: {
          id: true,
          key: true,
        },
      });

      if (categories.length !== dedupedKeys.length) {
        const foundKeys = new Set(categories.map((category) => category.key));
        const missingKeys = dedupedKeys.filter((key) => !foundKeys.has(key));

        return apiError(400, "VALIDATION_ERROR", "Unknown category keys", missingKeys);
      }

      const updated = await prisma.$transaction(async (tx) => {
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
        return apiError(403, "FORBIDDEN", "Wrong answer ownership verification failed");
      }

      throw error;
    }
  } catch {
    return apiError(500, "INTERNAL_SERVER_ERROR", "Unexpected server error");
  }
}
