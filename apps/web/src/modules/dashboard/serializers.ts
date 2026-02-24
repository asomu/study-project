import type { CategoryDistribution, TrendPoint, WeakUnit } from "@/modules/analytics/dashboard-metrics";

export type DashboardOverviewResponse = {
  progress: {
    recommendedPct: number;
    actualPct: number;
    coveredUnits: number;
    totalUnits: number;
  };
  mastery: {
    overallScorePct: number;
    recentAccuracyPct: number;
    difficultyWeightedAccuracyPct: number;
  };
  summary: {
    totalAttempts: number;
    totalItems: number;
    wrongAnswers: number;
    asOfDate: string;
  };
};

export type DashboardWeaknessResponse = {
  weakUnits: WeakUnit[];
  categoryDistribution: CategoryDistribution[];
};

export type DashboardTrendsResponse = {
  points: TrendPoint[];
};

function normalizePct(value: number) {
  return Math.min(100, Math.max(0, Math.round(value * 10) / 10));
}

export function serializeDashboardOverview(payload: DashboardOverviewResponse): DashboardOverviewResponse {
  return {
    progress: {
      recommendedPct: normalizePct(payload.progress.recommendedPct),
      actualPct: normalizePct(payload.progress.actualPct),
      coveredUnits: payload.progress.coveredUnits,
      totalUnits: payload.progress.totalUnits,
    },
    mastery: {
      overallScorePct: normalizePct(payload.mastery.overallScorePct),
      recentAccuracyPct: normalizePct(payload.mastery.recentAccuracyPct),
      difficultyWeightedAccuracyPct: normalizePct(payload.mastery.difficultyWeightedAccuracyPct),
    },
    summary: payload.summary,
  };
}

export function serializeDashboardWeakness(payload: DashboardWeaknessResponse): DashboardWeaknessResponse {
  return {
    weakUnits: payload.weakUnits.map((item) => ({
      ...item,
      accuracyPct: normalizePct(item.accuracyPct),
    })),
    categoryDistribution: payload.categoryDistribution.map((item) => ({
      ...item,
      ratio: normalizePct(item.ratio),
    })),
  };
}

export function serializeDashboardTrends(payload: DashboardTrendsResponse): DashboardTrendsResponse {
  return {
    points: payload.points.map((point) => ({
      ...point,
      accuracyPct: normalizePct(point.accuracyPct),
      masteryScorePct: normalizePct(point.masteryScorePct),
    })),
  };
}
