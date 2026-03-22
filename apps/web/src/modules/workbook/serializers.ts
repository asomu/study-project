import type { Prisma } from "@prisma/client";
import type {
  StudentWorkbookItem,
  StudentWorkbookListResponse,
  WorkbookProgressDashboardResponse,
  WorkbookProgressRowResponse,
  WorkbookTemplateItem,
  WorkbookTemplateListResponse,
} from "@/modules/workbook/contracts";

export const workbookTemplateInclude = {
  stages: {
    orderBy: {
      sortOrder: "asc",
    },
  },
} as const;

export const studentWorkbookInclude = {
  workbookTemplate: {
    include: workbookTemplateInclude,
  },
} as const;

export type WorkbookTemplateWithStages = Prisma.WorkbookTemplateGetPayload<{
  include: typeof workbookTemplateInclude;
}>;

export type StudentWorkbookWithTemplate = Prisma.StudentWorkbookGetPayload<{
  include: typeof studentWorkbookInclude;
}>;

export function serializeWorkbookTemplate(record: WorkbookTemplateWithStages): WorkbookTemplateItem {
  return {
    id: record.id,
    title: record.title,
    publisher: record.publisher,
    schoolLevel: record.schoolLevel,
    grade: record.grade,
    semester: record.semester,
    isActive: record.isActive,
    stages: record.stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      sortOrder: stage.sortOrder,
    })),
  };
}

export function serializeStudentWorkbook(record: StudentWorkbookWithTemplate): StudentWorkbookItem {
  return {
    id: record.id,
    studentId: record.studentId,
    isArchived: record.isArchived,
    template: serializeWorkbookTemplate(record.workbookTemplate),
  };
}

export function serializeWorkbookTemplateList(payload: WorkbookTemplateListResponse): WorkbookTemplateListResponse {
  return payload;
}

export function serializeStudentWorkbookList(payload: StudentWorkbookListResponse): StudentWorkbookListResponse {
  return payload;
}

export function serializeWorkbookProgressDashboard(payload: WorkbookProgressDashboardResponse): WorkbookProgressDashboardResponse {
  return payload;
}

export function serializeWorkbookProgressRow(payload: WorkbookProgressRowResponse): WorkbookProgressRowResponse {
  return payload;
}
