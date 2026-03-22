import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertStudentOwnership, OwnershipError } from "@/modules/auth/ownership-guard";
import { isGuardianRole } from "@/modules/auth/roles";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { parseDateOnly } from "@/modules/dashboard/date-range";
import { apiError } from "@/modules/shared/api-error";
import { logAccessDenied } from "@/modules/shared/structured-log";
import { isGradeAllowedForSchoolLevel } from "@/modules/wrong-note/constants";
import { serializeWrongNote, serializeWrongNoteList, serializeWrongNoteStudent, wrongNoteInclude } from "@/modules/wrong-note/serializers";
import { buildWrongNotePagination, buildWrongNoteWhere } from "@/modules/wrong-note/service";
import { parseGuardianWrongNoteListQuery } from "@/modules/wrong-note/schemas";

export async function GET(request: Request) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    if (!isGuardianRole(session.role)) {
      logAccessDenied("guardian_wrong_notes_requires_guardian_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Guardian role is required");
    }

    const requestUrl = new URL(request.url);
    const parsed = parseGuardianWrongNoteListQuery(requestUrl);

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
      const student = await assertStudentOwnership({
        studentId: parsed.data.studentId,
        guardianUserId: session.userId,
      });

      if (parsed.data.grade && !isGradeAllowedForSchoolLevel(student.schoolLevel, parsed.data.grade)) {
        return apiError(400, "VALIDATION_ERROR", "grade is not available for the student's school level");
      }

      const where = buildWrongNoteWhere({
        studentId: student.id,
        grade: parsed.data.grade,
        semester: parsed.data.semester,
        curriculumNodeId: parsed.data.curriculumNodeId,
        reason: parsed.data.reason,
        from,
        to,
        hasFeedback: parsed.data.hasFeedback ? parsed.data.hasFeedback === "true" : undefined,
      });
      const page = parsed.data.page;
      const pageSize = parsed.data.pageSize;
      const [totalItems, wrongNotes] = await Promise.all([
        prisma.wrongNote.count({ where }),
        prisma.wrongNote.findMany({
          where,
          include: wrongNoteInclude,
          orderBy: {
            createdAt: "desc",
          },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);

      return NextResponse.json(
        serializeWrongNoteList({
          student: serializeWrongNoteStudent({
            id: student.id,
            name: student.name,
            schoolLevel: student.schoolLevel,
            grade: student.grade,
          }),
          pagination: buildWrongNotePagination(page, pageSize, totalItems),
          wrongNotes: wrongNotes.map((wrongNote) =>
            serializeWrongNote(wrongNote, {
              kind: "guardian",
              studentId: student.id,
            }),
          ),
        }),
      );
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
