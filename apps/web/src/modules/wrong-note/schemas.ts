import { WrongNoteReason } from "@prisma/client";
import { z } from "zod";
import { WRONG_NOTE_DEFAULT_PAGE_SIZE, WRONG_NOTE_MAX_PAGE_SIZE } from "@/modules/wrong-note/constants";

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

const semesterSchema = z.coerce.number().int().min(1).max(2);

export const createWrongNoteSchema = z.object({
  curriculumNodeId: z.string().trim().min(1),
  semester: semesterSchema,
  reason: z.nativeEnum(WrongNoteReason),
  studentMemo: z.string().trim().max(1000).optional(),
});

export const updateStudentWrongNoteSchema = z
  .object({
    curriculumNodeId: z.string().trim().min(1).optional(),
    semester: semesterSchema.optional(),
    reason: z.nativeEnum(WrongNoteReason).optional(),
    studentMemo: z.string().trim().max(1000).nullable().optional(),
  })
  .refine(
    (value) =>
      value.curriculumNodeId !== undefined || value.reason !== undefined || value.studentMemo !== undefined || value.semester !== undefined,
    "At least one field must be updated",
  )
  .refine(
    (value) =>
      (value.curriculumNodeId === undefined && value.semester === undefined) ||
      (value.curriculumNodeId !== undefined && value.semester !== undefined),
    "curriculumNodeId and semester must be updated together",
  );

export const wrongNoteFeedbackSchema = z.object({
  text: z.string().max(2000),
});

export const wrongNoteListQuerySchema = z.object({
  semester: semesterSchema.optional(),
  curriculumNodeId: z.string().trim().min(1).optional(),
  reason: z.nativeEnum(WrongNoteReason).optional(),
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

export function parseStudentWrongNoteListQuery(url: URL) {
  return wrongNoteListQuerySchema.safeParse({
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
