import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAttemptSchema } from "@/modules/assessment/schemas";
import { assertMaterialOwnership, assertStudentOwnership, OwnershipError } from "@/modules/auth/ownership-guard";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { apiError } from "@/modules/shared/api-error";

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

function parseAttemptDate(value: string) {
  const normalized = dateOnlyPattern.test(value) ? `${value}T00:00:00.000Z` : value;
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    const payload = await request.json().catch(() => null);
    const parsed = createAttemptSchema.safeParse(payload);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }

    const attemptDate = parseAttemptDate(parsed.data.attemptDate);

    if (!attemptDate) {
      return apiError(400, "VALIDATION_ERROR", "attemptDate must be a valid date string");
    }

    try {
      const student = await assertStudentOwnership({
        studentId: parsed.data.studentId,
        guardianUserId: session.userId,
      });

      const material = await assertMaterialOwnership({
        materialId: parsed.data.materialId,
        guardianUserId: session.userId,
      });

      if (material.studentId !== student.id) {
        return apiError(400, "VALIDATION_ERROR", "materialId does not belong to studentId");
      }

      const attempt = await prisma.attempt.create({
        data: {
          studentId: student.id,
          materialId: material.id,
          attemptDate,
          notes: parsed.data.notes?.trim() ? parsed.data.notes.trim() : null,
        },
      });

      return NextResponse.json(attempt, { status: 201 });
    } catch (error) {
      if (error instanceof OwnershipError) {
        return apiError(403, "FORBIDDEN", "Resource ownership verification failed");
      }

      throw error;
    }
  } catch {
    return apiError(500, "INTERNAL_SERVER_ERROR", "Unexpected server error");
  }
}
