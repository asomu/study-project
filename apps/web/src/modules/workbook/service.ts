import type { Prisma, SchoolLevel, WorkbookProgressStatus } from "@prisma/client";
import { Subject } from "@prisma/client";
import type {
  WorkbookProgressDashboardResponse,
  WorkbookProgressRowResponse,
  WorkbookProgressStageState,
  WorkbookProgressUnitBar,
  WorkbookProgressUnitRow,
} from "@/modules/workbook/contracts";
import type { StudentWorkbookWithTemplate } from "@/modules/workbook/serializers";
import { startOfDayUtc } from "@/modules/shared/date-range";

type CurriculumNodeSummary = {
  id: string;
  unitName: string;
  unitCode: string;
  sortOrder: number;
};

type ProgressRecordSummary = {
  curriculumNodeId: string;
  workbookTemplateStageId: string;
  status: WorkbookProgressStatus;
  lastUpdatedAt: Date;
};

export function normalizeWorkbookText(value: string) {
  return value.trim();
}

export function normalizeWorkbookStages(
  stages: Array<{
    name: string;
    sortOrder: number;
  }>,
) {
  return [...stages]
    .map((stage, index) => ({
      name: normalizeWorkbookText(stage.name),
      sortOrder: stage.sortOrder ?? index,
    }))
    .sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }

      return left.name.localeCompare(right.name, "ko");
    })
    .map((stage, index) => ({
      ...stage,
      sortOrder: index,
    }));
}

export function validateWorkbookStageNames(stages: Array<{ name: string }>) {
  const keySet = new Set<string>();

  for (const stage of stages) {
    const key = stage.name.trim().toLocaleLowerCase("ko-KR");

    if (keySet.has(key)) {
      return false;
    }

    keySet.add(key);
  }

  return true;
}

export function getWorkbookCurriculumNodeWhere(params: {
  schoolLevel: SchoolLevel;
  grade: number;
  semester: number;
  asOfDate?: Date;
}): Prisma.CurriculumNodeWhereInput {
  const asOfDate = startOfDayUtc(params.asOfDate ?? new Date());

  return {
    schoolLevel: params.schoolLevel,
    subject: Subject.math,
    grade: params.grade,
    semester: params.semester,
    activeFrom: {
      lte: asOfDate,
    },
    OR: [
      {
        activeTo: null,
      },
      {
        activeTo: {
          gte: asOfDate,
        },
      },
    ],
  };
}

function sortCurriculumNodes(nodes: CurriculumNodeSummary[]) {
  return [...nodes].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.unitCode.localeCompare(right.unitCode, "ko");
  });
}

export function buildWorkbookProgressMatrix(params: {
  nodes: CurriculumNodeSummary[];
  stages: Array<{
    id: string;
    name: string;
    sortOrder: number;
  }>;
  progressRecords: ProgressRecordSummary[];
}) {
  const sortedNodes = sortCurriculumNodes(params.nodes);
  const sortedStages = [...params.stages].sort((left, right) => left.sortOrder - right.sortOrder);
  const progressByKey = params.progressRecords.reduce<Map<string, ProgressRecordSummary>>((result, record) => {
    result.set(`${record.curriculumNodeId}:${record.workbookTemplateStageId}`, record);
    return result;
  }, new Map());

  const units: WorkbookProgressUnitRow[] = sortedNodes.map((node) => ({
    curriculumNodeId: node.id,
    unitName: node.unitName,
    stageStates: sortedStages.map<WorkbookProgressStageState>((stage) => {
      const record = progressByKey.get(`${node.id}:${stage.id}`);

      return {
        workbookTemplateStageId: stage.id,
        stageName: stage.name,
        status: record?.status ?? "not_started",
        lastUpdatedAt: record?.lastUpdatedAt.toISOString() ?? null,
      };
    }),
  }));

  const unitBars: WorkbookProgressUnitBar[] = units.map((unit) => ({
    curriculumNodeId: unit.curriculumNodeId,
    unitName: unit.unitName,
    completedSteps: unit.stageStates.filter((stage) => stage.status === "completed").length,
    totalSteps: unit.stageStates.length,
  }));

  const summary = units.reduce(
    (result, unit) => {
      for (const stage of unit.stageStates) {
        result.totalSteps += 1;

        if (stage.status === "completed") {
          result.completedCount += 1;
        } else if (stage.status === "in_progress") {
          result.inProgressCount += 1;
        } else {
          result.notStartedCount += 1;
        }
      }

      return result;
    },
    {
      totalSteps: 0,
      notStartedCount: 0,
      inProgressCount: 0,
      completedCount: 0,
    },
  );

  return {
    units,
    unitBars,
    summary: {
      ...summary,
      completedPct: summary.totalSteps ? Math.round((summary.completedCount / summary.totalSteps) * 100) : 0,
    },
  };
}

export function buildWorkbookProgressDashboardPayload(params: {
  student: WorkbookProgressDashboardResponse["student"];
  availableWorkbooks: WorkbookProgressDashboardResponse["availableWorkbooks"];
  selectedWorkbook: StudentWorkbookWithTemplate | null;
  nodes: CurriculumNodeSummary[];
  progressRecords: ProgressRecordSummary[];
}): WorkbookProgressDashboardResponse {
  if (!params.selectedWorkbook) {
    return {
      student: params.student,
      availableWorkbooks: params.availableWorkbooks,
      selectedWorkbook: null,
      summary: {
        totalSteps: 0,
        notStartedCount: 0,
        inProgressCount: 0,
        completedCount: 0,
        completedPct: 0,
      },
      unitBars: [],
      units: [],
    };
  }

  const matrix = buildWorkbookProgressMatrix({
    nodes: params.nodes,
    stages: params.selectedWorkbook.workbookTemplate.stages,
    progressRecords: params.progressRecords,
  });

  return {
    student: params.student,
    availableWorkbooks: params.availableWorkbooks,
    selectedWorkbook: {
      studentWorkbookId: params.selectedWorkbook.id,
      templateId: params.selectedWorkbook.workbookTemplate.id,
      title: params.selectedWorkbook.workbookTemplate.title,
      publisher: params.selectedWorkbook.workbookTemplate.publisher,
      grade: params.selectedWorkbook.workbookTemplate.grade,
      semester: params.selectedWorkbook.workbookTemplate.semester,
      stages: params.selectedWorkbook.workbookTemplate.stages.map((stage) => ({
        id: stage.id,
        name: stage.name,
        sortOrder: stage.sortOrder,
      })),
    },
    summary: matrix.summary,
    unitBars: matrix.unitBars,
    units: matrix.units,
  };
}

export function buildWorkbookProgressRowPayload(params: {
  selectedWorkbook: StudentWorkbookWithTemplate;
  node: CurriculumNodeSummary;
  progressRecords: ProgressRecordSummary[];
}): WorkbookProgressRowResponse {
  const matrix = buildWorkbookProgressMatrix({
    nodes: [params.node],
    stages: params.selectedWorkbook.workbookTemplate.stages,
    progressRecords: params.progressRecords,
  });

  return {
    row: matrix.units[0],
  };
}
