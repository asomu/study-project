import { Subject } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isGuardianRole } from "@/modules/auth/roles";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { apiError } from "@/modules/shared/api-error";
import { logAccessDenied, logUnexpectedError } from "@/modules/shared/structured-log";
import { getLatestCurriculumNodes } from "@/modules/study/authoring";
import { serializeAuthoringConceptLesson, serializeAuthoringPracticeSet } from "@/modules/study/serializers";
import { parseStudyContentQuery } from "@/modules/study/schemas";

export async function GET(request: Request) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    if (!isGuardianRole(session.role)) {
      logAccessDenied("study_content_requires_guardian_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Guardian role is required");
    }

    const requestUrl = new URL(request.url);
    const parsed = parseStudyContentQuery(requestUrl);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }

    const { curriculumVersion, curriculumNodes } = await getLatestCurriculumNodes(parsed.data);
    const curriculumNodeIds = curriculumNodes.map((node) => node.id);

    if (!curriculumNodeIds.length) {
      return NextResponse.json({
        curriculumVersion,
        curriculumNodes,
        practiceSets: [],
        conceptLessons: [],
      });
    }

    const [practiceSets, conceptLessons] = await Promise.all([
      prisma.practiceSet.findMany({
        where: {
          schoolLevel: parsed.data.schoolLevel,
          subject: Subject.math,
          grade: parsed.data.grade,
          semester: parsed.data.semester,
          curriculumNodeId: {
            in: curriculumNodeIds,
          },
        },
        orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
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
      }),
      prisma.conceptLesson.findMany({
        where: {
          curriculumNodeId: {
            in: curriculumNodeIds,
          },
        },
        orderBy: {
          curriculumNode: {
            sortOrder: "asc",
          },
        },
        include: {
          curriculumNode: true,
        },
      }),
    ]);

    return NextResponse.json({
      curriculumVersion,
      curriculumNodes,
      practiceSets: practiceSets.map(serializeAuthoringPracticeSet),
      conceptLessons: conceptLessons.map(serializeAuthoringConceptLesson),
    });
  } catch (error) {
    logUnexpectedError("study_content_read.route_error", error);
    return apiError(500, "INTERNAL_SERVER_ERROR", "Unexpected server error");
  }
}
