import { z } from "zod";
import {
  WRONG_NOTE_CHART_DIMENSION_VALUES,
  WRONG_NOTE_DEFAULT_PAGE_SIZE,
  WRONG_NOTE_MAX_PAGE_SIZE,
  WRONG_NOTE_REASON_VALUES,
} from "@/modules/wrong-note/constants";

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

const semesterSchema = z.coerce.number().int().min(1).max(2);
const gradeSchema = z.coerce.number().int().min(1).max(12);

export const createWrongNoteSchema = z.object({
  grade: gradeSchema,
  curriculumNodeId: z.string().trim().min(1),
  semester: semesterSchema,
  reason: z.enum(WRONG_NOTE_REASON_VALUES),
  studentMemo: z.string().trim().max(1000).optional(),
  studentWorkbookId: z.string().trim().min(1).optional(),
  workbookTemplateStageId: z.string().trim().min(1).optional(),
}).refine(
  (value) =>
    (value.studentWorkbookId === undefined && value.workbookTemplateStageId === undefined) ||
    (value.studentWorkbookId !== undefined && value.workbookTemplateStageId !== undefined),
  "studentWorkbookId and workbookTemplateStageId must be provided together",
);

export const updateStudentWrongNoteSchema = z
  .object({
    grade: gradeSchema.optional(),
    curriculumNodeId: z.string().trim().min(1).optional(),
    semester: semesterSchema.optional(),
    reason: z.enum(WRONG_NOTE_REASON_VALUES).optional(),
    studentMemo: z.string().trim().max(1000).nullable().optional(),
    studentWorkbookId: z.string().trim().min(1).nullable().optional(),
    workbookTemplateStageId: z.string().trim().min(1).nullable().optional(),
  })
  .refine(
    (value) =>
      value.curriculumNodeId !== undefined ||
      value.reason !== undefined ||
      value.studentMemo !== undefined ||
      value.semester !== undefined ||
      value.grade !== undefined ||
      value.studentWorkbookId !== undefined ||
      value.workbookTemplateStageId !== undefined,
    "At least one field must be updated",
  )
  .refine(
    (value) =>
      (value.curriculumNodeId === undefined && value.semester === undefined && value.grade === undefined) ||
      (value.curriculumNodeId !== undefined && value.semester !== undefined && value.grade !== undefined),
    "curriculumNodeId, grade, and semester must be updated together",
  )
  .refine(
    (value) =>
      (value.studentWorkbookId === undefined && value.workbookTemplateStageId === undefined) ||
      (value.studentWorkbookId !== undefined && value.workbookTemplateStageId !== undefined),
    "studentWorkbookId and workbookTemplateStageId must be updated together",
  );

export const wrongNoteFeedbackSchema = z.object({
  text: z.string().max(2000),
});

export const wrongNoteListQuerySchema = z.object({
  grade: gradeSchema.optional(),
  semester: semesterSchema.optional(),
  curriculumNodeId: z.string().trim().min(1).optional(),
  reason: z.enum(WRONG_NOTE_REASON_VALUES).optional(),
  from: z.string().trim().regex(dateOnlyPattern, "from must be formatted as YYYY-MM-DD").optional(),
  to: z.string().trim().regex(dateOnlyPattern, "to must be formatted as YYYY-MM-DD").optional(),
  hasFeedback: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(WRONG_NOTE_MAX_PAGE_SIZE).default(WRONG_NOTE_DEFAULT_PAGE_SIZE),
});

export const guardianWrongNoteListQuerySchema = wrongNoteListQuerySchema.extend({
  studentId: z.string().trim().min(1),
});

export const guardianWrongNoteDashboardQuerySchema = z.object({
  studentId: z.string().trim().min(1),
});

export const guardianWrongNoteDetailQuerySchema = z.object({
  studentId: z.string().trim().min(1),
});

export const wrongNoteChartQuerySchema = z.object({
  dimension: z.enum(WRONG_NOTE_CHART_DIMENSION_VALUES),
  grade: gradeSchema,
  semester: semesterSchema,
});

export const guardianWrongNoteChartQuerySchema = wrongNoteChartQuerySchema.extend({
  studentId: z.string().trim().min(1),
});

export function parseStudentWrongNoteListQuery(url: URL) {
  return wrongNoteListQuerySchema.safeParse({
    grade: url.searchParams.get("grade") ?? undefined,
    semester: url.searchParams.get("semester") ?? undefined,
    curriculumNodeId: url.searchParams.get("curriculumNodeId") ?? undefined,
    reason: url.searchParams.get("reason") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    hasFeedback: url.searchParams.get("hasFeedback") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  });
}

export function parseGuardianWrongNoteListQuery(url: URL) {
  return guardianWrongNoteListQuerySchema.safeParse({
    studentId: url.searchParams.get("studentId"),
    grade: url.searchParams.get("grade") ?? undefined,
    semester: url.searchParams.get("semester") ?? undefined,
    curriculumNodeId: url.searchParams.get("curriculumNodeId") ?? undefined,
    reason: url.searchParams.get("reason") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    hasFeedback: url.searchParams.get("hasFeedback") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  });
}

export function parseGuardianWrongNoteDashboardQuery(url: URL) {
  return guardianWrongNoteDashboardQuerySchema.safeParse({
    studentId: url.searchParams.get("studentId"),
  });
}

export function parseGuardianWrongNoteDetailQuery(url: URL) {
  return guardianWrongNoteDetailQuerySchema.safeParse({
    studentId: url.searchParams.get("studentId"),
  });
}

export function parseStudentWrongNoteChartQuery(url: URL) {
  return wrongNoteChartQuerySchema.safeParse({
    dimension: url.searchParams.get("dimension") ?? undefined,
    grade: url.searchParams.get("grade") ?? undefined,
    semester: url.searchParams.get("semester") ?? undefined,
  });
}

export function parseGuardianWrongNoteChartQuery(url: URL) {
  return guardianWrongNoteChartQuerySchema.safeParse({
    studentId: url.searchParams.get("studentId"),
    dimension: url.searchParams.get("dimension") ?? undefined,
    grade: url.searchParams.get("grade") ?? undefined,
    semester: url.searchParams.get("semester") ?? undefined,
  });
}
