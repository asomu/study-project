import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertAttemptItemOwnership, assertStudentOwnership, OwnershipError } from "@/modules/auth/ownership-guard";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { createWrongAnswerSchema, parseDateOnly, parseListWrongAnswersQuery } from "@/modules/mistake-note/schemas";
import { serializeWrongAnswer } from "@/modules/mistake-note/serializers";
import { apiError } from "@/modules/shared/api-error";

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

function toEndOfDay(value: Date) {
  const result = new Date(value);
  result.setUTCHours(23, 59, 59, 999);
  return result;
}

export async function GET(request: Request) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    const requestUrl = new URL(request.url);
    const parsed = parseListWrongAnswersQuery(requestUrl);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }

    const from = parsed.data.from ? parseDateOnly(parsed.data.from) : null;
    const to = parsed.data.to ? parseDateOnly(parsed.data.to) : null;

    if ((parsed.data.from && !from) || (parsed.data.to && !to)) {
      return apiError(400, "VALIDATION_ERROR", "from/to must be valid date strings");
    }

    if (from && to && from > to) {
      return apiError(400, "VALIDATION_ERROR", "from must be before or equal to to");
    }

    try {
      await assertStudentOwnership({
        studentId: parsed.data.studentId,
        guardianUserId: session.userId,
      });

      const wrongAnswers = await prisma.wrongAnswer.findMany({
        where: {
          attemptItem: {
            attempt: {
              studentId: parsed.data.studentId,
            },
          },
          ...(from || to
            ? {
                createdAt: {
                  ...(from ? { gte: from } : {}),
                  ...(to ? { lte: toEndOfDay(to) } : {}),
                },
              }
            : {}),
          ...(parsed.data.categoryKey
            ? {
                categories: {
                  some: {
                    category: {
                      key: parsed.data.categoryKey,
                    },
                  },
                },
              }
            : {}),
        },
        include: wrongAnswerInclude,
        orderBy: {
          createdAt: "desc",
        },
      });

      return NextResponse.json({
        wrongAnswers: wrongAnswers.map(serializeWrongAnswer),
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

export async function POST(request: Request) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    const payload = await request.json().catch(() => null);
    const parsed = createWrongAnswerSchema.safeParse(payload);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }

    try {
      const attemptItem = await assertAttemptItemOwnership({
        attemptItemId: parsed.data.attemptItemId,
        guardianUserId: session.userId,
      });

      if (attemptItem.isCorrect) {
        return apiError(400, "VALIDATION_ERROR", "Wrong answer can be created only for incorrect items");
      }

      const existing = await prisma.wrongAnswer.findUnique({
        where: {
          attemptItemId: attemptItem.id,
        },
      });

      const wrongAnswer = existing
        ? await prisma.wrongAnswer.update({
            where: {
              id: existing.id,
            },
            data: {
              memo: parsed.data.memo?.trim() ? parsed.data.memo.trim() : null,
            },
            include: wrongAnswerInclude,
          })
        : await prisma.wrongAnswer.create({
            data: {
              attemptItemId: attemptItem.id,
              memo: parsed.data.memo?.trim() ? parsed.data.memo.trim() : null,
            },
            include: wrongAnswerInclude,
          });

      return NextResponse.json(serializeWrongAnswer(wrongAnswer), {
        status: existing ? 200 : 201,
      });
    } catch (error) {
      if (error instanceof OwnershipError) {
        return apiError(403, "FORBIDDEN", "Attempt item ownership verification failed");
      }

      throw error;
    }
  } catch {
    return apiError(500, "INTERNAL_SERVER_ERROR", "Unexpected server error");
  }
}
