import type { SchoolLevel, WrongNoteReason } from "@prisma/client";

export type WrongNoteStudentSummary = {
  id: string;
  name: string;
  schoolLevel: SchoolLevel;
  grade: number;
};

export type WrongNoteItem = {
  id: string;
  imagePath: string;
  studentMemo: string | null;
  createdAt: string;
  updatedAt: string;
  curriculum: {
    grade: number;
    semester: number;
    curriculumNodeId: string;
    unitName: string;
  };
  reason: {
    key: WrongNoteReason;
    labelKo: string;
  };
  feedback: {
    text: string;
    updatedAt: string | null;
    guardianUserId: string | null;
  } | null;
};

export type WrongNoteListResponse = {
  student: WrongNoteStudentSummary;
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  wrongNotes: WrongNoteItem[];
};

export type WrongNoteDashboardResponse = {
  student: WrongNoteStudentSummary;
  summary: {
    totalNotes: number;
    recent30DaysNotes: number;
    feedbackCompletedNotes: number;
    reasonCounts: Record<WrongNoteReason, number>;
  };
  reasonDistribution: Array<{
    key: WrongNoteReason;
    labelKo: string;
    count: number;
  }>;
  topUnits: Array<{
    curriculumNodeId: string;
    unitName: string;
    count: number;
  }>;
};
