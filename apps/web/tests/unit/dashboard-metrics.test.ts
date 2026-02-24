import { describe, expect, it } from "vitest";
import {
  calculateActualPct,
  calculateOverallScorePct,
  calculateRecommendedPct,
  rankWeakUnits,
} from "@/modules/analytics/dashboard-metrics";

describe("dashboard metrics", () => {
  it("calculates recommended progress from semester elapsed days", () => {
    const semesterStart = new Date("2026-01-01T00:00:00.000Z");
    const semesterEnd = new Date("2026-06-30T00:00:00.000Z");
    const asOfDate = new Date("2026-03-31T00:00:00.000Z");

    const result = calculateRecommendedPct(semesterStart, semesterEnd, asOfDate);

    expect(result).toBeCloseTo(49.7, 1);
  });

  it("calculates actual progress from covered/total units", () => {
    expect(calculateActualPct(2, 5)).toBe(40);
    expect(calculateActualPct(0, 0)).toBe(0);
  });

  it("clamps overall score to 0..100", () => {
    const high = calculateOverallScorePct({
      recentAccuracyPct: 120,
      consistencyPct: 130,
      difficultyWeightedAccuracyPct: 110,
    });

    const low = calculateOverallScorePct({
      recentAccuracyPct: -30,
      consistencyPct: -10,
      difficultyWeightedAccuracyPct: -5,
    });

    expect(high).toBe(100);
    expect(low).toBe(0);
  });

  it("ranks weak units by low accuracy, then attempts, then unit name", () => {
    const ranked = rankWeakUnits(
      [
        { curriculumNodeId: "unit-a", unitName: "가", isCorrect: false },
        { curriculumNodeId: "unit-a", unitName: "가", isCorrect: true },
        { curriculumNodeId: "unit-a", unitName: "가", isCorrect: false },
        { curriculumNodeId: "unit-b", unitName: "나", isCorrect: false },
        { curriculumNodeId: "unit-b", unitName: "나", isCorrect: true },
        { curriculumNodeId: "unit-b", unitName: "나", isCorrect: true },
        { curriculumNodeId: "unit-c", unitName: "다", isCorrect: true },
        { curriculumNodeId: "unit-c", unitName: "다", isCorrect: true },
      ],
      3,
      5,
    );

    expect(ranked).toHaveLength(2);
    expect(ranked[0].curriculumNodeId).toBe("unit-a");
    expect(ranked[0].accuracyPct).toBeCloseTo(33.3, 1);
    expect(ranked[1].curriculumNodeId).toBe("unit-b");
  });
});
