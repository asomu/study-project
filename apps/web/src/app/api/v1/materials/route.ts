import { Subject } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createMaterialSchema } from "@/modules/assessment/schemas";
import { assertStudentOwnership, OwnershipError } from "@/modules/auth/ownership-guard";
import { isGuardianRole } from "@/modules/auth/roles";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { apiError } from "@/modules/shared/api-error";
import { logAccessDenied } from "@/modules/shared/structured-log";

export async function POST(request: Request) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    if (!isGuardianRole(session.role)) {
      logAccessDenied("materials_requires_guardian_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Guardian role is required");
    }

    const payload = await request.json().catch(() => null);
    const parsed = createMaterialSchema.safeParse(payload);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }

    try {
      const student = await assertStudentOwnership({
        studentId: parsed.data.studentId,
        guardianUserId: session.userId,
      });

      const material = await prisma.material.create({
        data: {
          studentId: student.id,
          title: parsed.data.title,
          publisher: parsed.data.publisher,
          subject: Subject.math,
          schoolLevel: student.schoolLevel,
          grade: parsed.data.grade,
          semester: parsed.data.semester,
        },
      });

      return NextResponse.json(material, { status: 201 });
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
