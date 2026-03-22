import { SchoolLevel } from "@prisma/client";
import { z } from "zod";
import { WORKBOOK_PROGRESS_STATUS_VALUES } from "@/modules/workbook/constants";

const gradeSchema = z.coerce.number().int().min(1).max(12);
const semesterSchema = z.coerce.number().int().min(1).max(2);

const workbookStageInputSchema = z.object({
  name: z.string().trim().min(1).max(50),
  sortOrder: z.coerce.number().int().min(0),
});

export const createWorkbookTemplateSchema = z.object({
  title: z.string().trim().min(1).max(100),
  publisher: z.string().trim().min(1).max(100),
  schoolLevel: z.nativeEnum(SchoolLevel),
  grade: gradeSchema,
  semester: semesterSchema,
  stages: z.array(workbookStageInputSchema).min(1).max(12),
});

export const updateWorkbookTemplateSchema = z
  .object({
    title: z.string().trim().min(1).max(100).optional(),
    publisher: z.string().trim().min(1).max(100).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => value.title !== undefined || value.publisher !== undefined || value.isActive !== undefined, {
    message: "At least one field must be updated",
  });

export const createStudentWorkbookSchema = z.object({
  studentId: z.string().trim().min(1),
  workbookTemplateId: z.string().trim().min(1),
});

export const updateStudentWorkbookSchema = z.object({
  isArchived: z.boolean(),
});

export const workbookProgressDashboardQuerySchema = z.object({
  grade: gradeSchema.optional(),
  studentWorkbookId: z.string().trim().min(1).optional(),
});

export const guardianWorkbookProgressDashboardQuerySchema = workbookProgressDashboardQuerySchema.extend({
  studentId: z.string().trim().min(1),
});

export const updateWorkbookProgressSchema = z.object({
  studentWorkbookId: z.string().trim().min(1),
  curriculumNodeId: z.string().trim().min(1),
  workbookTemplateStageId: z.string().trim().min(1),
  status: z.enum(WORKBOOK_PROGRESS_STATUS_VALUES),
});

export const guardianStudentWorkbookListQuerySchema = z.object({
  studentId: z.string().trim().min(1),
});

export function parseWorkbookProgressDashboardQuery(url: URL) {
  return workbookProgressDashboardQuerySchema.safeParse({
    grade: url.searchParams.get("grade") ?? undefined,
    studentWorkbookId: url.searchParams.get("studentWorkbookId") ?? undefined,
  });
}

export function parseGuardianWorkbookProgressDashboardQuery(url: URL) {
  return guardianWorkbookProgressDashboardQuerySchema.safeParse({
    studentId: url.searchParams.get("studentId"),
    grade: url.searchParams.get("grade") ?? undefined,
    studentWorkbookId: url.searchParams.get("studentWorkbookId") ?? undefined,
  });
}

export function parseGuardianStudentWorkbookListQuery(url: URL) {
  return guardianStudentWorkbookListQuerySchema.safeParse({
    studentId: url.searchParams.get("studentId"),
  });
}
