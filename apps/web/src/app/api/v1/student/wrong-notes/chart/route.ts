import { NextResponse } from "next/server";
import { Subject } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertStudentLoginOwnership, OwnershipError } from "@/modules/auth/ownership-guard";
import { isStudentRole } from "@/modules/auth/roles";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { formatDateOnly, startOfDayUtc } from "@/modules/shared/date-range";
import { findCurriculumByQuery } from "@/modules/curriculum/service";
import { apiError } from "@/modules/shared/api-error";
import { logAccessDenied } from "@/modules/shared/structured-log";
import { isGradeAllowedForSchoolLevel } from "@/modules/wrong-note/constants";
import { serializeWrongNoteChart, serializeWrongNoteStudent } from "@/modules/wrong-note/serializers";
import {
  buildWrongNoteChartStats,
  buildWrongNoteReasonChartBars,
  buildWrongNoteUnitChartBars,
  buildWrongNoteWhere,
  createWrongNoteReasonCounts,
} from "@/modules/wrong-note/service";
import { parseStudentWrongNoteChartQuery } from "@/modules/wrong-note/schemas";

export async function GET(request: Request) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    if (!isStudentRole(session.role)) {
      logAccessDenied("student_wrong_note_chart_requires_student_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Student role is required");
    }

    const requestUrl = new URL(request.url);
    const parsed = parseStudentWrongNoteChartQuery(requestUrl);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }

    try {
      const student = await assertStudentLoginOwnership({
        loginUserId: session.userId,
      });

      if (!isGradeAllowedForSchoolLevel(student.schoolLevel, parsed.data.grade)) {
        return apiError(400, "VALIDATION_ERROR", "grade is not available for the student's school level");
      }

      const where = buildWrongNoteWhere({
        studentId: student.id,
        grade: parsed.data.grade,
        semester: parsed.data.semester,
      });

      const bars =
        parsed.data.dimension === "unit"
          ? buildWrongNoteUnitChartBars(
              (
                await findCurriculumByQuery({
                  schoolLevel: student.schoolLevel,
                  subject: Subject.math,
                  grade: parsed.data.grade,
                  semester: parsed.data.semester,
                  asOfDate: formatDateOnly(startOfDayUtc(new Date())),
                })
              )?.nodes.map((node) => ({
                id: node.id,
                unitName: node.unitName,
                unitCode: node.unitCode,
                sortOrder: node.sortOrder,
              })) ?? [],
              [...(await prisma.wrongNote.findMany({
                where,
                select: {
                  curriculumNodeId: true,
                },
              })).reduce<Map<string, number>>((result, row) => {
                result.set(row.curriculumNodeId, (result.get(row.curriculumNodeId) ?? 0) + 1);
                return result;
              }, new Map()).entries()].map(([curriculumNodeId, count]) => ({
                curriculumNodeId,
                _count: {
                  _all: count,
                },
              })),
            )
          : buildWrongNoteReasonChartBars(
              (await prisma.wrongNote.findMany({
                where,
                select: {
                  reason: true,
                },
              })).reduce((result, row) => {
                result[row.reason] += 1;
                return result;
              }, createWrongNoteReasonCounts()),
            );
      const chartStats = buildWrongNoteChartStats(bars);

      return NextResponse.json(
        serializeWrongNoteChart({
          student: serializeWrongNoteStudent({
            id: student.id,
            name: student.name,
            schoolLevel: student.schoolLevel,
            grade: student.grade,
          }),
          chart: {
            dimension: parsed.data.dimension,
            grade: parsed.data.grade,
            semester: parsed.data.semester,
            bars,
            ...chartStats,
          },
        }),
      );
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
