import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertStudentLoginOwnership, OwnershipError } from "@/modules/auth/ownership-guard";
import { isStudentRole } from "@/modules/auth/roles";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { apiError } from "@/modules/shared/api-error";
import { logAccessDenied } from "@/modules/shared/structured-log";
import {
  serializeStudentWorkbook,
  serializeWorkbookProgressDashboard,
  studentWorkbookInclude,
} from "@/modules/workbook/serializers";
import { parseWorkbookProgressDashboardQuery } from "@/modules/workbook/schemas";
import { buildWorkbookProgressDashboardPayload, getWorkbookCurriculumNodeWhere } from "@/modules/workbook/service";
import { serializeWrongNoteStudent } from "@/modules/wrong-note/serializers";

export async function GET(request: Request) {
  try {
    const session = await getAuthSessionFromRequest(request);

    if (!session) {
      return apiError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    if (!isStudentRole(session.role)) {
      logAccessDenied("student_workbook_progress_dashboard_requires_student_role", {
        userId: session.userId,
        role: session.role,
      });
      return apiError(403, "FORBIDDEN", "Student role is required");
    }

    const requestUrl = new URL(request.url);
    const parsed = parseWorkbookProgressDashboardQuery(requestUrl);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }

    try {
      const student = await assertStudentLoginOwnership({
        loginUserId: session.userId,
      });
      const availableWorkbooks = await prisma.studentWorkbook.findMany({
        where: {
          studentId: student.id,
          isArchived: false,
          workbookTemplate: {
            isActive: true,
          },
        },
        include: studentWorkbookInclude,
        orderBy: {
          createdAt: "desc",
        },
      });

      let selectedWorkbook = null;

      if (parsed.data.studentWorkbookId) {
        selectedWorkbook = availableWorkbooks.find((workbook) => workbook.id === parsed.data.studentWorkbookId) ?? null;

        if (!selectedWorkbook) {
          return apiError(404, "NOT_FOUND", "Student workbook not found");
        }
      } else if (parsed.data.grade !== undefined) {
        selectedWorkbook = availableWorkbooks.find((workbook) => workbook.workbookTemplate.grade === parsed.data.grade) ?? null;
      } else {
        selectedWorkbook = availableWorkbooks[0] ?? null;
      }

      const [nodes, progressRecords] = selectedWorkbook
        ? await Promise.all([
            prisma.curriculumNode.findMany({
              where: getWorkbookCurriculumNodeWhere({
                schoolLevel: selectedWorkbook.workbookTemplate.schoolLevel,
                grade: selectedWorkbook.workbookTemplate.grade,
                semester: selectedWorkbook.workbookTemplate.semester,
              }),
              select: {
                id: true,
                unitName: true,
                unitCode: true,
                sortOrder: true,
              },
              orderBy: [
                {
                  sortOrder: "asc",
                },
                {
                  unitCode: "asc",
                },
              ],
            }),
            prisma.studentWorkbookProgress.findMany({
              where: {
                studentWorkbookId: selectedWorkbook.id,
              },
              select: {
                curriculumNodeId: true,
                workbookTemplateStageId: true,
                status: true,
                lastUpdatedAt: true,
              },
            }),
          ])
        : [[], []];

      return NextResponse.json(
        serializeWorkbookProgressDashboard(
          buildWorkbookProgressDashboardPayload({
            student: serializeWrongNoteStudent(student),
            availableWorkbooks: availableWorkbooks.map(serializeStudentWorkbook),
            selectedWorkbook,
            nodes,
            progressRecords,
          }),
        ),
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
