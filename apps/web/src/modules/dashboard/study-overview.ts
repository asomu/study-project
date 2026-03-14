import { StudyProgressStatus } from "@prisma/client";
import { endOfDayUtc, startOfDayUtc, addDaysUtc } from "@/modules/dashboard/date-range";
import { sortReviewQueue, summarizeProgressStatuses } from "@/modules/study/service";

export const STUDY_RECENT_WINDOW_DAYS = 7;
export const STUDY_ATTENTION_UNIT_LIMIT = 5;
export const STUDY_RECOMMENDED_ACTION_LIMIT = 3;

export type DashboardStudyProgressItem = {
  curriculumNodeId: string;
  unitName: string;
  sortOrder: number;
  status: StudyProgressStatus;
  lastStudiedAt: Date | null;
  reviewedAt: Date | null;
  hasConcept: boolean;
  practiceSetId: string | null;
  practiceSetTitle: string | null;
};

export type DashboardStudyReviewQueueItem = {
  attemptId: string;
  submittedAt: Date;
  elapsedSeconds: number | null;
  wrongItems: number;
  hasReview: boolean;
  practiceSetId: string | null;
  practiceSetTitle: string | null;
  curriculumNodeId: string | null;
  unitName: string | null;
};

export type DashboardRecommendedActionKind =
  | "pending_review_session"
  | "review_needed_unit"
  | "stalled_in_progress_unit"
  | "planned_unit";

export type DashboardRecommendedAction = {
  kind: DashboardRecommendedActionKind;
  title: string;
  description: string;
  href?: string;
  sessionId?: string;
  curriculumNodeId?: string;
  practiceSetId?: string;
};

const attentionPriority: Record<StudyProgressStatus, number> = {
  review_needed: 0,
  in_progress: 1,
  planned: 2,
  completed: 3,
};

function compareNullableDates(left: Date | null, right: Date | null) {
  if (!left && !right) {
    return 0;
  }

  if (!left) {
    return 1;
  }

  if (!right) {
    return -1;
  }

  return left.getTime() - right.getTime();
}

function compareProgressItems(left: DashboardStudyProgressItem, right: DashboardStudyProgressItem) {
  const priorityDiff = attentionPriority[left.status] - attentionPriority[right.status];

  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  const reviewedDiff = compareNullableDates(left.reviewedAt, right.reviewedAt);

  if (reviewedDiff !== 0) {
    return reviewedDiff;
  }

  const studiedDiff = compareNullableDates(left.lastStudiedAt, right.lastStudiedAt);

  if (studiedDiff !== 0) {
    return studiedDiff;
  }

  if (left.sortOrder !== right.sortOrder) {
    return left.sortOrder - right.sortOrder;
  }

  return left.unitName.localeCompare(right.unitName, "ko");
}

export function getStudyRecentWindowStart(asOfDate: Date) {
  return addDaysUtc(startOfDayUtc(asOfDate), -(STUDY_RECENT_WINDOW_DAYS - 1));
}

export function isWithinStudyRecentWindow(date: Date, asOfDate: Date) {
  const windowStart = getStudyRecentWindowStart(asOfDate);
  const windowEnd = endOfDayUtc(asOfDate);

  return date.getTime() >= windowStart.getTime() && date.getTime() <= windowEnd.getTime();
}

export function isStalledInProgress(item: Pick<DashboardStudyProgressItem, "status" | "lastStudiedAt">, asOfDate: Date) {
  if (item.status !== StudyProgressStatus.in_progress || !item.lastStudiedAt) {
    return false;
  }

  return item.lastStudiedAt.getTime() < getStudyRecentWindowStart(asOfDate).getTime();
}

export function summarizeStudyOverview(
  reviewQueue: DashboardStudyReviewQueueItem[],
  progress: DashboardStudyProgressItem[],
  asOfDate: Date,
) {
  const progressSummary = summarizeProgressStatuses(progress);
  const recentAttempts = reviewQueue.filter((item) => isWithinStudyRecentWindow(item.submittedAt, asOfDate));
  const recentElapsedSeconds = recentAttempts.reduce((total, item) => total + Math.max(0, item.elapsedSeconds ?? 0), 0);

  return {
    progressSummary,
    summary: {
      pendingReviews: reviewQueue.filter((item) => !item.hasReview).length,
      reviewNeededUnits: progressSummary.review_needed,
      inProgressUnits: progressSummary.in_progress,
      recentStudyMinutes7d: Math.floor(recentElapsedSeconds / 60),
      submittedSessions7d: recentAttempts.length,
    },
  };
}

export function buildAttentionUnits(progress: DashboardStudyProgressItem[], limit = STUDY_ATTENTION_UNIT_LIMIT) {
  return [...progress]
    .filter((item) => item.status !== StudyProgressStatus.completed)
    .sort(compareProgressItems)
    .slice(0, limit);
}

export function buildRecommendedActions(params: {
  studentId: string;
  reviewQueue: DashboardStudyReviewQueueItem[];
  progress: DashboardStudyProgressItem[];
  asOfDate: Date;
  limit?: number;
}) {
  const { studentId, reviewQueue, progress, asOfDate, limit = STUDY_RECOMMENDED_ACTION_LIMIT } = params;
  const reviewHref = `/study/reviews?studentId=${studentId}`;
  const actions: DashboardRecommendedAction[] = [];

  const pendingReviews = sortReviewQueue(reviewQueue.filter((item) => !item.hasReview));
  const reviewNeededUnits = buildAttentionUnits(progress.filter((item) => item.status === StudyProgressStatus.review_needed), limit);
  const stalledUnits = [...progress]
    .filter((item) => isStalledInProgress(item, asOfDate))
    .sort(compareProgressItems);
  const plannedUnits = [...progress]
    .filter((item) => item.status === StudyProgressStatus.planned && Boolean(item.practiceSetId))
    .sort(compareProgressItems);

  for (const item of pendingReviews) {
    actions.push({
      kind: "pending_review_session",
      title: `${item.practiceSetTitle ?? "학습 세션"} 리뷰 대기`,
      description: `${item.unitName ?? "해당 단원"} 제출이 아직 검토되지 않았습니다. 보호자 피드백을 남겨 주세요.`,
      href: reviewHref,
      sessionId: item.attemptId,
      curriculumNodeId: item.curriculumNodeId ?? undefined,
      practiceSetId: item.practiceSetId ?? undefined,
    });
  }

  for (const item of reviewNeededUnits) {
    actions.push({
      kind: "review_needed_unit",
      title: `${item.unitName} 복습 필요`,
      description: "학생이 복습 필요 상태에 머물러 있습니다. 피드백과 다음 연습 계획을 확인하세요.",
      href: reviewHref,
      curriculumNodeId: item.curriculumNodeId,
      practiceSetId: item.practiceSetId ?? undefined,
    });
  }

  for (const item of stalledUnits) {
    actions.push({
      kind: "stalled_in_progress_unit",
      title: `${item.unitName} 학습 재개`,
      description: "최근 7일 동안 학습 기록이 멈췄습니다. 다시 이어서 풀 문제를 점검하세요.",
      href: reviewHref,
      curriculumNodeId: item.curriculumNodeId,
      practiceSetId: item.practiceSetId ?? undefined,
    });
  }

  for (const item of plannedUnits) {
    actions.push({
      kind: "planned_unit",
      title: `${item.unitName} 시작 유도`,
      description: `${item.practiceSetTitle ?? "연습 세트"}로 아직 시작하지 않은 단원을 열어 주세요.`,
      href: reviewHref,
      curriculumNodeId: item.curriculumNodeId,
      practiceSetId: item.practiceSetId ?? undefined,
    });
  }

  return actions.slice(0, limit);
}
