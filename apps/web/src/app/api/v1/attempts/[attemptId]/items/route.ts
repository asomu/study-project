import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAttemptItemsSchema } from "@/modules/assessment/schemas";
import { assertAttemptOwnership, OwnershipError } from "@/modules/auth/ownership-guard";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { apiError } from "@/modules/shared/api-error";

type RouteContext = {
  params: Promise<{ attemptId: string }> | { attemptId: string };
};

async function readAttemptId(context: RouteContext) {
  const params = await context.params;
  return params.attemptId;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    const attemptId = await readAttemptId(context);

    if (!attemptId) {
      return apiError(400, "VALIDATION_ERROR", "attemptId is required");
    }

    const payload = await request.json().catch(() => null);
    const parsed = createAttemptItemsSchema.safeParse(payload);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }

    const duplicateProblemNos = parsed.data.items
      .map((item) => item.problemNo)
      .filter((problemNo, index, list) => list.indexOf(problemNo) !== index);

    if (duplicateProblemNos.length) {
      return apiError(400, "VALIDATION_ERROR", "Duplicate problemNo values are not allowed", duplicateProblemNos);
    }

    try {
      await assertAttemptOwnership({
        attemptId,
        guardianUserId: session.userId,
      });

      const problemNos = parsed.data.items.map((item) => item.problemNo);
      const curriculumNodeIds = [...new Set(parsed.data.items.map((item) => item.curriculumNodeId))];

      const [existingItems, curriculumNodes] = await Promise.all([
        prisma.attemptItem.findMany({
          where: {
            attemptId,
            problemNo: {
              in: problemNos,
            },
          },
          select: {
            problemNo: true,
          },
        }),
        prisma.curriculumNode.findMany({
          where: {
            id: {
              in: curriculumNodeIds,
            },
          },
          select: {
            id: true,
          },
        }),
      ]);

      if (existingItems.length) {
        return apiError(
          400,
          "VALIDATION_ERROR",
          "problemNo already exists for attempt",
          existingItems.map((item) => item.problemNo),
        );
      }

      if (curriculumNodes.length !== curriculumNodeIds.length) {
        const foundIds = new Set(curriculumNodes.map((node) => node.id));
        const missingNodeIds = curriculumNodeIds.filter((id) => !foundIds.has(id));

        return apiError(400, "VALIDATION_ERROR", "Invalid curriculumNodeId values", missingNodeIds);
      }

      const createdItems = await prisma.$transaction(
        parsed.data.items.map((item) =>
          prisma.attemptItem.create({
            data: {
              attemptId,
              curriculumNodeId: item.curriculumNodeId,
              problemNo: item.problemNo,
              isCorrect: item.isCorrect,
              difficulty: item.difficulty ?? null,
            },
          }),
        ),
      );

      return NextResponse.json(
        {
          attemptId,
          items: createdItems,
        },
        { status: 201 },
      );
    } catch (error) {
      if (error instanceof OwnershipError) {
        return apiError(403, "FORBIDDEN", "Attempt ownership verification failed");
      }

      throw error;
    }
  } catch {
    return apiError(500, "INTERNAL_SERVER_ERROR", "Unexpected server error");
  }
}
