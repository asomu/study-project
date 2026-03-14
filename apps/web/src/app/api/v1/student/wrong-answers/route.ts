import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertStudentLoginOwnership, OwnershipError } from "@/modules/auth/ownership-guard";
import { isStudentRole } from "@/modules/auth/roles";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { serializeWrongAnswer } from "@/modules/mistake-note/serializers";
import { parseDateOnly } from "@/modules/mistake-note/schemas";
import { apiError } from "@/modules/shared/api-error";
import { logAccessDenied } from "@/modules/shared/structured-log";

const querySchema = z.object({
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  categoryKey: z.string().trim().min(1).optional(),
});

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

    if (!isStudentRole(session.role)) {
      logAccessDenied("student_wrong_answers_requires_student_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Student role is required");
    }

    const requestUrl = new URL(request.url);
    const parsed = querySchema.safeParse({
      from: requestUrl.searchParams.get("from") ?? undefined,
      to: requestUrl.searchParams.get("to") ?? undefined,
      categoryKey: requestUrl.searchParams.get("categoryKey") ?? undefined,
    });

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }

    try {
      const student = await assertStudentLoginOwnership({
        loginUserId: session.userId,
      });
      const from = parsed.data.from ? parseDateOnly(parsed.data.from) : null;
      const to = parsed.data.to ? parseDateOnly(parsed.data.to) : null;

      if ((parsed.data.from && !from) || (parsed.data.to && !to)) {
        return apiError(400, "VALIDATION_ERROR", "from/to must be valid date strings");
      }

      if (from && to && from > to) {
        return apiError(400, "VALIDATION_ERROR", "from must be before or equal to to");
      }

      const wrongAnswers = await prisma.wrongAnswer.findMany({
        where: {
          attemptItem: {
            attempt: {
              studentId: student.id,
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
        return apiError(403, "FORBIDDEN", "Student profile linkage verification failed");
      }

      throw error;
    }
  } catch {
    return apiError(500, "INTERNAL_SERVER_ERROR", "Unexpected server error");
  }
}
