export const DASHBOARD_WAVE3_FIXED_AS_OF_DATE = "2026-02-21";
export const DASHBOARD_WAVE3_FIXED_RANGE_START = "2026-01-25";
export const DASHBOARD_WAVE3_TRENDS_ACTIVE_WEEK_LABEL = "2026-02-17 ~ 2026-02-23: 0.0% / 0.0%";

const categoryLabelMap: Record<string, string> = {
  calculation_mistake: "단순 연산 실수",
  misread_question: "문제 잘못 읽음",
  lack_of_concept: "문제 이해 못함",
};

export type DashboardWave3State = {
  totalAttempts: number;
  totalItems: number;
  wrongAnswers: number;
  categoryKeys: string[];
};

function uniqueCategoryKeys(keys: string[]) {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const key of keys) {
    if (!seen.has(key)) {
      seen.add(key);
      ordered.push(key);
    }
  }

  return ordered;
}

export function buildDashboardWave3Overview(state: DashboardWave3State, asOfDate: string) {
  const hasItems = state.totalItems > 0;

  return {
    progress: {
      recommendedPct: 30,
      actualPct: hasItems ? 100 : 0,
      coveredUnits: hasItems ? 1 : 0,
      totalUnits: 1,
    },
    mastery: {
      overallScorePct: hasItems ? 68.1 : 0,
      recentAccuracyPct: hasItems ? 0 : 0,
      difficultyWeightedAccuracyPct: hasItems ? 0 : 0,
    },
    summary: {
      totalAttempts: state.totalAttempts,
      totalItems: state.totalItems,
      wrongAnswers: state.wrongAnswers,
      asOfDate,
    },
  };
}

export function buildDashboardWave3Weakness(state: DashboardWave3State) {
  const hasItems = state.totalItems > 0;
  const keys = uniqueCategoryKeys(state.categoryKeys);
  const total = keys.length || 1;

  return {
    weakUnits: hasItems
      ? [
          {
            curriculumNodeId: "curriculum-e2e-1",
            unitName: "소인수분해",
            attempts: 3,
            accuracyPct: 33.3,
            wrongCount: 2,
          },
        ]
      : [],
    categoryDistribution: state.wrongAnswers
      ? keys.map((key) => ({
          key,
          labelKo: categoryLabelMap[key] ?? key,
          count: 1,
          ratio: Math.round((100 / total) * 10) / 10,
        }))
      : [],
  };
}

export function buildDashboardWave3Trends(state: DashboardWave3State) {
  const hasItems = state.totalItems > 0;

  return {
    points: [
      {
        weekStart: "2026-02-10",
        weekEnd: "2026-02-16",
        totalItems: 0,
        correctItems: 0,
        accuracyPct: 0,
        masteryScorePct: 0,
      },
      {
        weekStart: "2026-02-17",
        weekEnd: "2026-02-23",
        totalItems: hasItems ? state.totalItems : 0,
        correctItems: 0,
        accuracyPct: 0,
        masteryScorePct: 0,
      },
    ],
  };
}

export function toCategoryLabel(categoryKey: string) {
  return categoryLabelMap[categoryKey] ?? categoryKey;
}
