import { describe, expect, it } from "vitest";
import { PracticeProblemType, StudyProgressStatus } from "@prisma/client";
import {
  gradePracticeSubmission,
  isValidProgressTransition,
  normalizeElapsedSeconds,
  selectDailyMission,
  sortReviewQueue,
} from "@/modules/study/service";

describe("study service", () => {
  it("grades short answers with normalized multiplication spacing and case", () => {
    const result = gradePracticeSubmission(
      [
        {
          id: "problem-1",
          curriculumNodeId: "node-1",
          problemNo: 1,
          type: PracticeProblemType.short_answer,
          correctAnswer: "2 x 3",
          difficulty: 2,
        },
        {
          id: "problem-2",
          curriculumNodeId: "node-1",
          problemNo: 2,
          type: PracticeProblemType.single_choice,
          correctAnswer: "4",
          difficulty: 1,
        },
      ],
      [
        {
          practiceProblemId: "problem-1",
          studentAnswer: " 2X3 ",
        },
        {
          practiceProblemId: "problem-2",
          studentAnswer: "3",
        },
      ],
    );

    expect(result.correctItems).toBe(1);
    expect(result.wrongItems).toBe(1);
    expect(result.gradedItems).toEqual([
      expect.objectContaining({
        practiceProblemId: "problem-1",
        isCorrect: true,
        studentAnswer: "2X3",
      }),
      expect.objectContaining({
        practiceProblemId: "problem-2",
        isCorrect: false,
        studentAnswer: "3",
      }),
    ]);
  });

  it("normalizes elapsed seconds from explicit values or timestamp diffs", () => {
    const startedAt = new Date("2026-03-08T00:00:00.000Z");
    const submittedAt = new Date("2026-03-08T00:02:12.000Z");

    expect(normalizeElapsedSeconds(152, startedAt, submittedAt)).toBe(152);
    expect(normalizeElapsedSeconds(undefined, startedAt, submittedAt)).toBe(132);
    expect(normalizeElapsedSeconds(99_999, startedAt, submittedAt)).toBe(8 * 60 * 60);
  });

  it("selects daily mission by review-needed priority before sort order", () => {
    const mission = selectDailyMission([
      {
        practiceSetId: "planned-first",
        title: "소인수분해 1",
        curriculumNodeId: "node-1",
        unitName: "소인수분해",
        problemCount: 3,
        sortOrder: 1,
        progressStatus: StudyProgressStatus.planned,
      },
      {
        practiceSetId: "review-second",
        title: "정수와 유리수 1",
        curriculumNodeId: "node-2",
        unitName: "정수와 유리수",
        problemCount: 3,
        sortOrder: 99,
        progressStatus: StudyProgressStatus.review_needed,
      },
    ]);

    expect(mission).toEqual(
      expect.objectContaining({
        practiceSetId: "review-second",
        progressStatus: StudyProgressStatus.review_needed,
      }),
    );
    expect(mission?.reason).toContain("복습");
  });

  it("rejects invalid progress transitions from completed back to planned", () => {
    expect(isValidProgressTransition(StudyProgressStatus.completed, StudyProgressStatus.planned)).toBe(false);
    expect(isValidProgressTransition(StudyProgressStatus.review_needed, StudyProgressStatus.completed)).toBe(true);
  });

  it("sorts review queue by unreviewed first, then most recent submissions", () => {
    const result = sortReviewQueue([
      {
        attemptId: "older-unreviewed",
        submittedAt: new Date("2026-03-08T09:00:00.000Z"),
        wrongItems: 1,
        hasReview: false,
      },
      {
        attemptId: "reviewed",
        submittedAt: new Date("2026-03-08T10:00:00.000Z"),
        wrongItems: 5,
        hasReview: true,
      },
      {
        attemptId: "newer-unreviewed",
        submittedAt: new Date("2026-03-08T11:00:00.000Z"),
        wrongItems: 2,
        hasReview: false,
      },
    ]);

    expect(result.map((item) => item.attemptId)).toEqual(["newer-unreviewed", "older-unreviewed", "reviewed"]);
  });
});
