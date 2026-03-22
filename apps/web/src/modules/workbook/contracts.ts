import type { SchoolLevel, WorkbookProgressStatus } from "@prisma/client";
import type { WrongNoteStudentSummary } from "@/modules/wrong-note/contracts";

export type WorkbookTemplateStageItem = {
  id: string;
  name: string;
  sortOrder: number;
};

export type WorkbookTemplateItem = {
  id: string;
  title: string;
  publisher: string;
  schoolLevel: SchoolLevel;
  grade: number;
  semester: number;
  isActive: boolean;
  stages: WorkbookTemplateStageItem[];
};

export type StudentWorkbookItem = {
  id: string;
  studentId: string;
  isArchived: boolean;
  template: WorkbookTemplateItem;
};

export type WorkbookProgressStageState = {
  workbookTemplateStageId: string;
  stageName: string;
  status: WorkbookProgressStatus;
  lastUpdatedAt: string | null;
};

export type WorkbookProgressUnitRow = {
  curriculumNodeId: string;
  unitName: string;
  stageStates: WorkbookProgressStageState[];
};

export type WorkbookProgressUnitBar = {
  curriculumNodeId: string;
  unitName: string;
  completedSteps: number;
  totalSteps: number;
};

export type WorkbookProgressDashboardResponse = {
  student: WrongNoteStudentSummary;
  availableWorkbooks: StudentWorkbookItem[];
  selectedWorkbook: {
    studentWorkbookId: string;
    templateId: string;
    title: string;
    publisher: string;
    grade: number;
    semester: number;
    stages: WorkbookTemplateStageItem[];
  } | null;
  summary: {
    totalSteps: number;
    notStartedCount: number;
    inProgressCount: number;
    completedCount: number;
    completedPct: number;
  };
  unitBars: WorkbookProgressUnitBar[];
  units: WorkbookProgressUnitRow[];
};

export type WorkbookTemplateListResponse = {
  workbookTemplates: WorkbookTemplateItem[];
};

export type StudentWorkbookListResponse = {
  student: WrongNoteStudentSummary;
  studentWorkbooks: StudentWorkbookItem[];
};

export type WorkbookProgressRowResponse = {
  row: WorkbookProgressUnitRow;
};
