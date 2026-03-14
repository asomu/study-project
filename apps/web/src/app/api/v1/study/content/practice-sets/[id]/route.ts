import { Subject } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isGuardianRole } from "@/modules/auth/roles";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { apiError } from "@/modules/shared/api-error";
import { logAccessDenied, logUnexpectedError } from "@/modules/shared/structured-log";
import {
  hasPracticeSetStructuralChanges,
  isPracticeSetStructureEditable,
  toPracticeProblemWriteData,
} from "@/modules/study/authoring";
import { serializeAuthoringPracticeSet } from "@/modules/study/serializers";
import { practiceSetUpsertSchema } from "@/modules/study/schemas";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

async function readPracticeSetId(context: RouteContext) {
  const params = await context.params;
  return params.id;
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    if (!isGuardianRole(session.role)) {
      logAccessDenied("study_content_update_practice_set_requires_guardian_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Guardian role is required");
    }

    const practiceSetId = await readPracticeSetId(context);

    if (!practiceSetId) {
      return apiError(400, "VALIDATION_ERROR", "practiceSetId is required");
    }

    const payload = await request.json().catch(() => null);
    const parsed = practiceSetUpsertSchema.safeParse(payload);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }

    const existing = await prisma.practiceSet.findUnique({
      where: {
        id: practiceSetId,
      },
      include: {
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

    if (!existing) {
      return apiError(404, "NOT_FOUND", "Practice set not found");
    }

    const hasStructuralChanges = hasPracticeSetStructuralChanges(
      {
        schoolLevel: existing.schoolLevel,
        grade: existing.grade,
        semester: existing.semester,
        curriculumNodeId: existing.curriculumNodeId,
        problems: existing.problems,
      },
      {
        schoolLevel: parsed.data.schoolLevel,
        grade: parsed.data.grade,
        semester: parsed.data.semester,
        curriculumNodeId: parsed.data.curriculumNodeId,
        problems: parsed.data.problems,
      },
    );

    if (!isPracticeSetStructureEditable(existing._count.attempts) && hasStructuralChanges) {
      return apiError(409, "CONFLICT", "Used practice sets can only update title, description, sort order, and active state");
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

    const updated = await prisma.$transaction(async (tx) => {
      await tx.practiceSet.update({
        where: {
          id: practiceSetId,
        },
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

      if (isPracticeSetStructureEditable(existing._count.attempts)) {
        await tx.practiceProblem.deleteMany({
          where: {
            practiceSetId,
          },
        });

        await tx.practiceProblem.createMany({
          data: toPracticeProblemWriteData(practiceSetId, parsed.data.curriculumNodeId, parsed.data.problems),
        });
      }

      return tx.practiceSet.findUnique({
        where: {
          id: practiceSetId,
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

    if (!updated) {
      return apiError(500, "INTERNAL_SERVER_ERROR", "Practice set could not be updated");
    }

    return NextResponse.json({ practiceSet: serializeAuthoringPracticeSet(updated) });
  } catch (error) {
    logUnexpectedError("study_content_update_practice_set.route_error", error);
    return apiError(500, "INTERNAL_SERVER_ERROR", "Unexpected server error");
  }
}
