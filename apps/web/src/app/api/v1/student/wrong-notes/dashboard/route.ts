import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertStudentLoginOwnership, OwnershipError } from "@/modules/auth/ownership-guard";
import { isStudentRole } from "@/modules/auth/roles";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { startOfDayUtc } from "@/modules/dashboard/date-range";
import { apiError } from "@/modules/shared/api-error";
import { logAccessDenied } from "@/modules/shared/structured-log";
import { WRONG_NOTE_REASON_OPTIONS } from "@/modules/wrong-note/constants";
import { serializeWrongNoteDashboard, serializeWrongNoteStudent } from "@/modules/wrong-note/serializers";
import {
  buildWrongNoteReasonCounts,
  buildWrongNoteTopUnits,
  getWrongNoteRecent30DaysStart,
} from "@/modules/wrong-note/service";

export async function GET(request: Request) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    if (!isStudentRole(session.role)) {
      logAccessDenied("student_wrong_note_dashboard_requires_student_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Student role is required");
    }

    try {
      const student = await assertStudentLoginOwnership({
        loginUserId: session.userId,
      });
      const today = startOfDayUtc(new Date());
      const recentStart = getWrongNoteRecent30DaysStart(today);
      const baseWhere = {
        studentId: student.id,
        deletedAt: null,
      } as const;
      const [totalNotes, recent30DaysNotes, feedbackCompletedNotes, reasonGroups, unitRows] = await Promise.all([
        prisma.wrongNote.count({
          where: baseWhere,
        }),
        prisma.wrongNote.count({
          where: {
            ...baseWhere,
            createdAt: {
              gte: recentStart,
            },
          },
        }),
        prisma.wrongNote.count({
          where: {
            ...baseWhere,
            guardianFeedbackAt: {
              not: null,
            },
          },
        }),
        prisma.wrongNote.groupBy({
          by: ["reason"],
          where: baseWhere,
          _count: {
            _all: true,
          },
        }),
        prisma.wrongNote.findMany({
          where: baseWhere,
          select: {
            curriculumNodeId: true,
            curriculumNode: {
              select: {
                unitName: true,
              },
            },
          },
        }),
      ]);
      const reasonCounts = buildWrongNoteReasonCounts(reasonGroups);

      return NextResponse.json(
        serializeWrongNoteDashboard({
          student: serializeWrongNoteStudent({
            id: student.id,
            name: student.name,
            schoolLevel: student.schoolLevel,
            grade: student.grade,
          }),
          summary: {
            totalNotes,
            recent30DaysNotes,
            feedbackCompletedNotes,
            reasonCounts,
          },
          reasonDistribution: WRONG_NOTE_REASON_OPTIONS.map((option) => ({
            key: option.key,
            labelKo: option.labelKo,
            count: reasonCounts[option.key],
          })),
          topUnits: buildWrongNoteTopUnits(
            unitRows.map((row) => ({
              curriculumNodeId: row.curriculumNodeId,
              unitName: row.curriculumNode.unitName,
            })),
          ),
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
