import { Subject } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isGuardianRole } from "@/modules/auth/roles";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { apiError } from "@/modules/shared/api-error";
import { logAccessDenied, logUnexpectedError } from "@/modules/shared/structured-log";
import { toPracticeProblemWriteData } from "@/modules/study/authoring";
import { serializeAuthoringPracticeSet } from "@/modules/study/serializers";
import { practiceSetUpsertSchema } from "@/modules/study/schemas";

export async function POST(request: Request) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    if (!isGuardianRole(session.role)) {
      logAccessDenied("study_content_create_practice_set_requires_guardian_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Guardian role is required");
    }

    const payload = await request.json().catch(() => null);
    const parsed = practiceSetUpsertSchema.safeParse(payload);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }

    const curriculumNode = await prisma.curriculumNode.findFirst({
      where: {
        id: parsed.data.curriculumNodeId,
        schoolLevel: parsed.data.schoolLevel,
        subject: Subject.math,
        grade: parsed.data.grade,
        semester: parsed.data.semester,
      },
      select: {
        id: true,
      },
    });

    if (!curriculumNode) {
      return apiError(404, "NOT_FOUND", "Curriculum node not found");
    }

    const created = await prisma.$transaction(async (tx) => {
      const practiceSet = await tx.practiceSet.create({
        data: {
          title: parsed.data.title.trim(),
          description: parsed.data.description?.trim() ? parsed.data.description.trim() : null,
          schoolLevel: parsed.data.schoolLevel,
          subject: Subject.math,
          grade: parsed.data.grade,
          semester: parsed.data.semester,
          curriculumNodeId: parsed.data.curriculumNodeId,
          sortOrder: parsed.data.sortOrder,
          isActive: parsed.data.isActive,
        },
      });

      await tx.practiceProblem.createMany({
        data: toPracticeProblemWriteData(practiceSet.id, parsed.data.curriculumNodeId, parsed.data.problems),
      });

      return tx.practiceSet.findUnique({
        where: {
          id: practiceSet.id,
        },
        include: {
          curriculumNode: true,
          problems: {
            orderBy: {
              problemNo: "asc",
            },
          },
          _count: {
            select: {
              attempts: true,
            },
          },
        },
      });
    });

    if (!created) {
      return apiError(500, "INTERNAL_SERVER_ERROR", "Practice set could not be created");
    }

    return NextResponse.json({ practiceSet: serializeAuthoringPracticeSet(created) }, { status: 201 });
  } catch (error) {
    logUnexpectedError("study_content_create_practice_set.route_error", error);
    return apiError(500, "INTERNAL_SERVER_ERROR", "Unexpected server error");
  }
}
