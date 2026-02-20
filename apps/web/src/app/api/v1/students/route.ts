import { SchoolLevel } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertStudentOwnership, OwnershipError } from "@/modules/auth/ownership-guard";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { apiError } from "@/modules/shared/api-error";

const createStudentSchema = z.object({
  name: z.string().trim().min(1).max(50),
  schoolLevel: z.nativeEnum(SchoolLevel),
  grade: z.number().int().min(1).max(12),
});

export async function GET(request: Request) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    const requestUrl = new URL(request.url);
    const studentId = requestUrl.searchParams.get("studentId");

    if (studentId) {
      try {
        const student = await assertStudentOwnership({
          studentId,
          guardianUserId: session.userId,
        });

        return NextResponse.json({ students: [student] });
      } catch (error) {
        if (error instanceof OwnershipError) {
          return apiError(403, "FORBIDDEN", "Student ownership verification failed");
        }

        throw error;
      }
    }

    const students = await prisma.student.findMany({
      where: {
        guardianUserId: session.userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ students });
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
    const parsed = createStudentSchema.safeParse(payload);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }

    const student = await prisma.student.create({
      data: {
        guardianUserId: session.userId,
        name: parsed.data.name,
        schoolLevel: parsed.data.schoolLevel,
        grade: parsed.data.grade,
      },
    });

    return NextResponse.json(student, { status: 201 });
  } catch {
    return apiError(500, "INTERNAL_SERVER_ERROR", "Unexpected server error");
  }
}
