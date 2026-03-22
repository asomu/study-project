import type { Prisma } from "@prisma/client";
import type {
  WrongNoteChartResponse,
  WrongNoteDashboardResponse,
  WrongNoteItem,
  WrongNoteListResponse,
  WrongNoteStudentSummary,
} from "@/modules/wrong-note/contracts";
import { getWrongNoteReasonLabel } from "@/modules/wrong-note/constants";
import { buildGuardianWrongNoteImageUrl, buildStudentWrongNoteImageUrl } from "@/modules/mistake-note/upload";

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
  studentWorkbook: {
    include: {
      workbookTemplate: {
        include: {
          stages: {
            orderBy: {
              sortOrder: "asc",
            },
          },
        },
      },
    },
  },
  workbookTemplateStage: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

export type WrongNoteWithRelations = Prisma.WrongNoteGetPayload<{
  include: typeof wrongNoteInclude;
}>;

type WrongNoteViewerContext =
  | {
      kind: "student";
    }
  | {
      kind: "guardian";
      studentId: string;
    };

export function serializeWrongNoteStudent(student: WrongNoteWithRelations["student"]): WrongNoteStudentSummary {
  return {
    id: student.id,
    name: student.name,
    schoolLevel: student.schoolLevel,
    grade: student.grade,
  };
}

function toWrongNoteImageUrl(record: WrongNoteWithRelations, viewer: WrongNoteViewerContext) {
  if (viewer.kind === "student") {
    return buildStudentWrongNoteImageUrl(record.id);
  }

  return buildGuardianWrongNoteImageUrl(record.id, viewer.studentId);
}

export function serializeWrongNote(record: WrongNoteWithRelations, viewer: WrongNoteViewerContext): WrongNoteItem {
  return {
    id: record.id,
    imagePath: toWrongNoteImageUrl(record, viewer),
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
    workbook:
      record.studentWorkbook && record.workbookTemplateStage
        ? {
            studentWorkbookId: record.studentWorkbook.id,
            templateId: record.studentWorkbook.workbookTemplate.id,
            title: record.studentWorkbook.workbookTemplate.title,
            publisher: record.studentWorkbook.workbookTemplate.publisher,
            stageId: record.workbookTemplateStage.id,
            stageName: record.workbookTemplateStage.name,
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

export function serializeWrongNoteChart(payload: WrongNoteChartResponse): WrongNoteChartResponse {
  return payload;
}
