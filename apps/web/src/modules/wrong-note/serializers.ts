import type { Prisma } from "@prisma/client";
import type { WrongNoteDashboardResponse, WrongNoteItem, WrongNoteListResponse, WrongNoteStudentSummary } from "@/modules/wrong-note/contracts";
import { getWrongNoteReasonLabel } from "@/modules/wrong-note/constants";

export const wrongNoteInclude = {
  student: {
    select: {
      id: true,
      name: true,
      schoolLevel: true,
      grade: true,
    },
  },
  curriculumNode: {
    select: {
      id: true,
      unitName: true,
      grade: true,
      semester: true,
    },
  },
} as const;

export type WrongNoteWithRelations = Prisma.WrongNoteGetPayload<{
  include: typeof wrongNoteInclude;
}>;

export function serializeWrongNoteStudent(student: WrongNoteWithRelations["student"]): WrongNoteStudentSummary {
  return {
    id: student.id,
    name: student.name,
    schoolLevel: student.schoolLevel,
    grade: student.grade,
  };
}

export function serializeWrongNote(record: WrongNoteWithRelations): WrongNoteItem {
  return {
    id: record.id,
    imagePath: record.imagePath,
    studentMemo: record.studentMemo,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    curriculum: {
      grade: record.curriculumNode.grade,
      semester: record.curriculumNode.semester,
      curriculumNodeId: record.curriculumNode.id,
      unitName: record.curriculumNode.unitName,
    },
    reason: {
      key: record.reason,
      labelKo: getWrongNoteReasonLabel(record.reason),
    },
    feedback: record.guardianFeedback
      ? {
          text: record.guardianFeedback,
          updatedAt: record.guardianFeedbackAt?.toISOString() ?? null,
          guardianUserId: record.guardianFeedbackByUserId,
        }
      : null,
  };
}

export function serializeWrongNoteList(payload: WrongNoteListResponse): WrongNoteListResponse {
  return payload;
}

export function serializeWrongNoteDashboard(payload: WrongNoteDashboardResponse): WrongNoteDashboardResponse {
  return payload;
}
