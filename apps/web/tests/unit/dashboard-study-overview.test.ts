import { describe, expect, it } from "vitest";
import { StudyProgressStatus } from "@prisma/client";
import {
  buildAttentionUnits,
  buildRecommendedActions,
  isStalledInProgress,
  summarizeStudyOverview,
  type DashboardStudyProgressItem,
  type DashboardStudyReviewQueueItem,
} from "@/modules/dashboard/study-overview";

const AS_OF_DATE = new Date("2026-03-15T00:00:00.000Z");

function createProgressItem(overrides: Partial<DashboardStudyProgressItem>): DashboardStudyProgressItem {
  return {
    curriculumNodeId: overrides.curriculumNodeId ?? "node-1",
    unitName: overrides.unitName ?? "소인수분해",
    sortOrder: overrides.sortOrder ?? 1,
    status: overrides.status ?? StudyProgressStatus.planned,
    lastStudiedAt: overrides.lastStudiedAt ?? null,
    reviewedAt: overrides.reviewedAt ?? null,
    hasConcept: overrides.hasConcept ?? false,
    practiceSetId: overrides.practiceSetId ?? null,
    practiceSetTitle: overrides.practiceSetTitle ?? null,
  };
}

function createQueueItem(overrides: Partial<DashboardStudyReviewQueueItem>): DashboardStudyReviewQueueItem {
  return {
    attemptId: overrides.attemptId ?? "attempt-1",
    submittedAt: overrides.submittedAt ?? new Date("2026-03-14T09:00:00.000Z"),
    elapsedSeconds: overrides.elapsedSeconds ?? 185,
    wrongItems: overrides.wrongItems ?? 1,
    hasReview: overrides.hasReview ?? false,
    practiceSetId: overrides.practiceSetId ?? "practice-1",
    practiceSetTitle: overrides.practiceSetTitle ?? "소인수분해 1",
    curriculumNodeId: overrides.curriculumNodeId ?? "node-1",
    unitName: overrides.unitName ?? "소인수분해",
  };
}

describe("dashboard study overview helpers", () => {
  it("summarizes pending reviews and recent 7-day study minutes from submitted practice sessions", () => {
    const { summary, progressSummary } = summarizeStudyOverview(
      [
        createQueueItem({
          attemptId: "recent-unreviewed",
          submittedAt: new Date("2026-03-14T09:00:00.000Z"),
          elapsedSeconds: 185,
          hasReview: false,
        }),
        createQueueItem({
          attemptId: "recent-reviewed",
          submittedAt: new Date("2026-03-10T12:00:00.000Z"),
          elapsedSeconds: 120,
          hasReview: true,
        }),
        createQueueItem({
          attemptId: "older-reviewed",
          submittedAt: new Date("2026-03-07T23:59:59.000Z"),
          elapsedSeconds: 600,
          hasReview: true,
        }),
      ],
      [
        createProgressItem({ status: StudyProgressStatus.review_needed }),
        createProgressItem({
          curriculumNodeId: "node-2",
          unitName: "정수와 유리수",
          sortOrder: 2,
          status: StudyProgressStatus.in_progress,
        }),
      ],
      AS_OF_DATE,
    );

    expect(summary).toEqual({
      pendingReviews: 1,
      reviewNeededUnits: 1,
      inProgressUnits: 1,
      recentStudyMinutes7d: 5,
      submittedSessions7d: 2,
    });
    expect(progressSummary).toEqual({
      planned: 0,
      in_progress: 1,
      review_needed: 1,
      completed: 0,
    });
  });

  it("sorts attention units by review-needed, in-progress, planned priority and caps at five", () => {
    const result = buildAttentionUnits([
      createProgressItem({
        curriculumNodeId: "node-planned",
        unitName: "계산 연습",
        sortOrder: 3,
        status: StudyProgressStatus.planned,
      }),
      createProgressItem({
        curriculumNodeId: "node-in-progress",
        unitName: "방정식",
        sortOrder: 2,
        status: StudyProgressStatus.in_progress,
      }),
      createProgressItem({
        curriculumNodeId: "node-review-needed",
        unitName: "정수와 유리수",
        sortOrder: 5,
        status: StudyProgressStatus.review_needed,
      }),
      createProgressItem({
        curriculumNodeId: "node-completed",
        unitName: "완료 단원",
        sortOrder: 1,
        status: StudyProgressStatus.completed,
      }),
      createProgressItem({
        curriculumNodeId: "node-review-needed-2",
        unitName: "식의 계산",
        sortOrder: 1,
        status: StudyProgressStatus.review_needed,
      }),
      createProgressItem({
        curriculumNodeId: "node-planned-2",
        unitName: "문자와 식",
        sortOrder: 4,
        status: StudyProgressStatus.planned,
      }),
    ]);

    expect(result.map((item) => item.curriculumNodeId)).toEqual([
      "node-review-needed-2",
      "node-review-needed",
      "node-in-progress",
      "node-planned",
      "node-planned-2",
    ]);
  });

  it("builds recommended actions with pending review first, then review-needed, stalled, and planned units", () => {
    const result = buildRecommendedActions({
      studentId: "student-1",
      asOfDate: AS_OF_DATE,
      reviewQueue: [
        createQueueItem({
          attemptId: "pending-review",
          submittedAt: new Date("2026-03-14T08:00:00.000Z"),
          hasReview: false,
        }),
      ],
      progress: [
        createProgressItem({
          curriculumNodeId: "review-needed-node",
          unitName: "정수와 유리수",
          sortOrder: 1,
          status: StudyProgressStatus.review_needed,
          practiceSetId: "practice-review-needed",
        }),
        createProgressItem({
          curriculumNodeId: "stalled-node",
          unitName: "일차방정식",
          sortOrder: 2,
          status: StudyProgressStatus.in_progress,
          lastStudiedAt: new Date("2026-03-01T00:00:00.000Z"),
          practiceSetId: "practice-stalled",
        }),
        createProgressItem({
          curriculumNodeId: "planned-node",
          unitName: "문자와 식",
          sortOrder: 3,
          status: StudyProgressStatus.planned,
          practiceSetId: "practice-planned",
          practiceSetTitle: "문자와 식 1",
        }),
      ],
    });

    expect(result).toHaveLength(3);
    expect(result.map((item) => item.kind)).toEqual([
      "pending_review_session",
      "review_needed_unit",
      "stalled_in_progress_unit",
    ]);
    expect(result[0]?.href).toBe("/study/reviews?studentId=student-1");
  });

  it("marks in-progress units as stalled only after the recent 7-day window is exceeded", () => {
    expect(
      isStalledInProgress(
        createProgressItem({
          status: StudyProgressStatus.in_progress,
          lastStudiedAt: new Date("2026-03-09T00:00:00.000Z"),
        }),
        AS_OF_DATE,
      ),
    ).toBe(false);

    expect(
      isStalledInProgress(
        createProgressItem({
          status: StudyProgressStatus.in_progress,
          lastStudiedAt: new Date("2026-03-07T23:59:59.000Z"),
        }),
        AS_OF_DATE,
      ),
    ).toBe(true);
  });
});
