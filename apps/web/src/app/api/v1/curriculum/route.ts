import { Subject } from "@prisma/client";
import { NextResponse } from "next/server";
import { findCurriculumByQuery, parseCurriculumQuery } from "@/modules/curriculum/service";
import { apiError } from "@/modules/shared/api-error";

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const parsed = parseCurriculumQuery(requestUrl);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }

    if (parsed.data.subject !== Subject.math) {
      return apiError(400, "VALIDATION_ERROR", "M2 supports only math subject");
    }

    const result = await findCurriculumByQuery(parsed.data);

    if (!result) {
      return apiError(404, "NOT_FOUND", "No curriculum nodes found for query");
    }

    return NextResponse.json({
      nodes: result.nodes,
      meta: {
        curriculumVersion: result.meta.curriculumVersion,
        effectiveFrom: result.meta.effectiveFrom?.toISOString() ?? null,
        effectiveTo: result.meta.effectiveTo?.toISOString() ?? null,
      },
    });
  } catch {
    return apiError(500, "INTERNAL_SERVER_ERROR", "Unexpected server error");
  }
}
