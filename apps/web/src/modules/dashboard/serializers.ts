import type { StudyProgressStatus } from "@prisma/client";
import type { CategoryDistribution, TrendPoint, WeakUnit } from "@/modules/analytics/dashboard-metrics";
import type {
  DashboardRecommendedAction,
  DashboardStudyProgressItem,
  DashboardStudyReviewQueueItem,
} from "@/modules/dashboard/study-overview";

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

export type DashboardStudyOverviewResponse = {
  student: {
    id: string;
    name: string;
    schoolLevel: "elementary" | "middle" | "high";
    grade: number;
  };
  summary: {
    pendingReviews: number;
    reviewNeededUnits: number;
    inProgressUnits: number;
    recentStudyMinutes7d: number;
    submittedSessions7d: number;
  };
  progressSummary: Record<StudyProgressStatus, number>;
  recommendedActions: DashboardRecommendedAction[];
  reviewQueuePreview: DashboardStudyReviewQueueItem[];
  attentionUnits: Array<Omit<DashboardStudyProgressItem, "sortOrder">>;
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

export function serializeDashboardStudyOverview(payload: DashboardStudyOverviewResponse): DashboardStudyOverviewResponse {
  return {
    student: payload.student,
    summary: {
      pendingReviews: payload.summary.pendingReviews,
      reviewNeededUnits: payload.summary.reviewNeededUnits,
      inProgressUnits: payload.summary.inProgressUnits,
      recentStudyMinutes7d: payload.summary.recentStudyMinutes7d,
      submittedSessions7d: payload.summary.submittedSessions7d,
    },
    progressSummary: payload.progressSummary,
    recommendedActions: payload.recommendedActions.map((action) => ({
      ...action,
    })),
    reviewQueuePreview: payload.reviewQueuePreview.map((item) => ({
      ...item,
    })),
    attentionUnits: payload.attentionUnits.map((item) => ({
      curriculumNodeId: item.curriculumNodeId,
      unitName: item.unitName,
      status: item.status,
      lastStudiedAt: item.lastStudiedAt,
      reviewedAt: item.reviewedAt,
      hasConcept: item.hasConcept,
      practiceSetId: item.practiceSetId,
      practiceSetTitle: item.practiceSetTitle,
    })),
  };
}
