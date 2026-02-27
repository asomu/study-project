import { SchoolLevel } from "@prisma/client";
import type { DashboardAttemptItemRecord, WeaknessRow } from "@/modules/analytics/dashboard-metrics";
import type { WeeklyBucket } from "@/modules/dashboard/date-range";

export const DASHBOARD_FIXED_NOW = new Date("2026-02-24T12:00:00.000Z");
export const DASHBOARD_FIXED_AS_OF_DATE = new Date("2026-02-24T00:00:00.000Z");
export const DASHBOARD_MONTHLY_RANGE_START = new Date("2026-01-26T00:00:00.000Z");
export const DASHBOARD_MONTHLY_RANGE_END = new Date("2026-02-24T23:59:59.999Z");
export const DASHBOARD_WAVE2_FIXED_NOW = new Date("2026-02-27T10:30:00.000Z");
export const DASHBOARD_WAVE2_DEFAULT_AS_OF_DATE = "2026-02-27";
export const DASHBOARD_WAVE2_DEFAULT_AS_OF_DATE_END = new Date("2026-02-27T23:59:59.999Z");
export const DASHBOARD_WAVE2_DEFAULT_SEMESTER_START = new Date("2026-01-01T00:00:00.000Z");
export const DASHBOARD_WAVE2_OVERVIEW_EMPTY_EXPECTED = {
  coveredUnits: 0,
  totalUnits: 0,
  actualPct: 0,
} as const;
export const DASHBOARD_WAVE2_SECOND_SEMESTER_DATE = "2026-07-01";
export const DASHBOARD_WAVE2_SECOND_SEMESTER_EXPECTED = {
  recommendedPct: 0.5,
  semesterStart: new Date("2026-07-01T00:00:00.000Z"),
  asOfDateEnd: new Date("2026-07-01T23:59:59.999Z"),
} as const;
export const DASHBOARD_WAVE2_RECOMMENDED_SECOND_SEMESTER_START = {
  semesterStart: new Date("2026-07-01T00:00:00.000Z"),
  semesterEnd: new Date("2026-12-31T00:00:00.000Z"),
  asOfDate: new Date("2026-07-01T00:00:00.000Z"),
  expectedPct: 0.5,
} as const;
export const DASHBOARD_WAVE2_RECOMMENDED_CLAMP_END = {
  semesterStart: new Date("2026-01-01T00:00:00.000Z"),
  semesterEnd: new Date("2026-06-30T00:00:00.000Z"),
  asOfDateAfterEnd: new Date("2026-07-05T00:00:00.000Z"),
  expectedPct: 100,
} as const;

export function createOwnedStudentFixture() {
  return {
    id: "student-1",
    guardianUserId: "guardian-1",
    name: "기본 학생",
    schoolLevel: SchoolLevel.middle,
    grade: 1,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-02-24T00:00:00.000Z"),
  };
}

export const DASHBOARD_CURRICULUM_NODES_FIXTURE = [
  {
    id: "node-current-1",
    curriculumVersion: "2026.01",
  },
  {
    id: "node-current-2",
    curriculumVersion: "2026.01",
  },
  {
    id: "node-legacy-1",
    curriculumVersion: "2022.12",
  },
] as const;

export const DASHBOARD_WEAKNESS_ROWS_FIXTURE: WeaknessRow[] = [
  { curriculumNodeId: "unit-a", unitName: "소인수분해", isCorrect: false },
  { curriculumNodeId: "unit-a", unitName: "소인수분해", isCorrect: true },
  { curriculumNodeId: "unit-a", unitName: "소인수분해", isCorrect: false },
  { curriculumNodeId: "unit-b", unitName: "정수와 유리수", isCorrect: false },
  { curriculumNodeId: "unit-b", unitName: "정수와 유리수", isCorrect: true },
  { curriculumNodeId: "unit-b", unitName: "정수와 유리수", isCorrect: true },
];

export const DASHBOARD_DIFFICULTY_ITEMS_FIXTURE: DashboardAttemptItemRecord[] = [
  {
    curriculumNodeId: "unit-1",
    attemptDate: new Date("2026-02-02T00:00:00.000Z"),
    isCorrect: true,
    difficulty: 5,
  },
  {
    curriculumNodeId: "unit-1",
    attemptDate: new Date("2026-02-04T00:00:00.000Z"),
    isCorrect: false,
    difficulty: null,
  },
  {
    curriculumNodeId: "unit-2",
    attemptDate: new Date("2026-02-06T00:00:00.000Z"),
    isCorrect: true,
    difficulty: 1,
  },
];

export const DASHBOARD_DIFFICULTY_EXPECTED = {
  weightedAccuracyPct: 66.7,
};

export const DASHBOARD_CONSISTENCY_FIXTURE = {
  weeklyAccuracies: [80, 60, 100],
  recentAccuracyFallback: 73.9,
  expectedConsistencyPct: 67.3,
};

export const DASHBOARD_CATEGORY_COUNT_FIXTURE = [
  { key: "lack_of_concept", labelKo: "문제 이해 못함" },
  { key: "misread_question", labelKo: "문제 잘못 읽음" },
  { key: "lack_of_concept", labelKo: "문제 이해 못함" },
] as const;

export const DASHBOARD_CATEGORY_TIE_FIXTURE = [
  { key: "misread_question", labelKo: "문제 잘못 읽음" },
  { key: "calculation_mistake", labelKo: "단순 연산 실수" },
] as const;

export const DASHBOARD_TREND_WEEKLY_BUCKETS_FIXTURE: WeeklyBucket[] = [
  {
    weekStart: new Date("2026-02-02T00:00:00.000Z"),
    weekEnd: new Date("2026-02-08T23:59:59.999Z"),
    rangeStart: new Date("2026-02-02T00:00:00.000Z"),
    rangeEnd: new Date("2026-02-08T23:59:59.999Z"),
  },
  {
    weekStart: new Date("2026-02-09T00:00:00.000Z"),
    weekEnd: new Date("2026-02-15T23:59:59.999Z"),
    rangeStart: new Date("2026-02-09T00:00:00.000Z"),
    rangeEnd: new Date("2026-02-15T23:59:59.999Z"),
  },
];

export const DASHBOARD_TREND_ITEMS_FIXTURE: DashboardAttemptItemRecord[] = [
  {
    curriculumNodeId: "unit-1",
    attemptDate: new Date("2026-02-02T00:00:00.000Z"),
    isCorrect: true,
    difficulty: 5,
  },
  {
    curriculumNodeId: "unit-1",
    attemptDate: new Date("2026-02-08T23:59:59.999Z"),
    isCorrect: false,
    difficulty: null,
  },
  {
    curriculumNodeId: "unit-2",
    attemptDate: new Date("2026-02-09T00:00:00.000Z"),
    isCorrect: true,
    difficulty: 3,
  },
  {
    curriculumNodeId: "unit-2",
    attemptDate: new Date("2026-02-15T23:59:59.999Z"),
    isCorrect: true,
    difficulty: 1,
  },
];

export const DASHBOARD_TRENDS_ROUTE_RANGE = {
  rangeStart: "2026-02-02",
  rangeEnd: "2026-02-15",
} as const;

export const DASHBOARD_TRENDS_ROUTE_ITEMS_FIXTURE = [
  {
    curriculumNodeId: "unit-1",
    isCorrect: true,
    difficulty: 5,
    attempt: {
      attemptDate: new Date("2026-02-02T00:00:00.000Z"),
    },
  },
  {
    curriculumNodeId: "unit-1",
    isCorrect: false,
    difficulty: null,
    attempt: {
      attemptDate: new Date("2026-02-08T23:59:59.999Z"),
    },
  },
  {
    curriculumNodeId: "unit-2",
    isCorrect: true,
    difficulty: 3,
    attempt: {
      attemptDate: new Date("2026-02-09T00:00:00.000Z"),
    },
  },
  {
    curriculumNodeId: "unit-2",
    isCorrect: true,
    difficulty: 1,
    attempt: {
      attemptDate: new Date("2026-02-15T23:59:59.999Z"),
    },
  },
] as const;

export const DASHBOARD_WAVE2_TRENDS_PARTIAL_RANGE = {
  rangeStart: "2026-02-04",
  rangeEnd: "2026-02-18",
} as const;

export const DASHBOARD_WAVE2_TRENDS_PARTIAL_ROUTE_ITEMS_FIXTURE = [
  {
    curriculumNodeId: "unit-partial-1",
    isCorrect: true,
    difficulty: 3,
    attempt: {
      attemptDate: new Date("2026-02-04T00:00:00.000Z"),
    },
  },
  {
    curriculumNodeId: "unit-partial-1",
    isCorrect: false,
    difficulty: 5,
    attempt: {
      attemptDate: new Date("2026-02-08T23:59:59.999Z"),
    },
  },
  {
    curriculumNodeId: "unit-partial-2",
    isCorrect: true,
    difficulty: 2,
    attempt: {
      attemptDate: new Date("2026-02-10T00:00:00.000Z"),
    },
  },
  {
    curriculumNodeId: "unit-partial-2",
    isCorrect: false,
    difficulty: 4,
    attempt: {
      attemptDate: new Date("2026-02-14T23:59:59.999Z"),
    },
  },
  {
    curriculumNodeId: "unit-partial-3",
    isCorrect: true,
    difficulty: 1,
    attempt: {
      attemptDate: new Date("2026-02-16T00:00:00.000Z"),
    },
  },
  {
    curriculumNodeId: "unit-partial-3",
    isCorrect: true,
    difficulty: 5,
    attempt: {
      attemptDate: new Date("2026-02-18T23:59:59.999Z"),
    },
  },
] as const;

export const DASHBOARD_WAVE2_TRENDS_PARTIAL_EXPECTED_POINTS = [
  {
    weekStart: "2026-02-02",
    weekEnd: "2026-02-08",
    totalItems: 2,
    correctItems: 1,
    accuracyPct: 50,
    masteryScorePct: 48.1,
  },
  {
    weekStart: "2026-02-09",
    weekEnd: "2026-02-15",
    totalItems: 2,
    correctItems: 1,
    accuracyPct: 50,
    masteryScorePct: 47.5,
  },
  {
    weekStart: "2026-02-16",
    weekEnd: "2026-02-22",
    totalItems: 2,
    correctItems: 2,
    accuracyPct: 100,
    masteryScorePct: 100,
  },
] as const;

export const DASHBOARD_WAVE2_TRENDS_RANGE_END_ONLY = {
  rangeEnd: "2026-02-24",
  expectedRangeStart: new Date("2026-01-28T00:00:00.000Z"),
  expectedRangeEnd: new Date("2026-02-24T23:59:59.999Z"),
  expectedFirstWeekStart: "2026-01-26",
  expectedLastWeekStart: "2026-02-23",
} as const;
