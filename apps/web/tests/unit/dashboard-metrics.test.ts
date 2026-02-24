import { describe, expect, it } from "vitest";
import {
  buildTrendPoints,
  calculateActualPct,
  calculateCategoryDistribution,
  calculateConsistencyPct,
  calculateDifficultyWeightedAccuracyPct,
  calculateOverallScorePct,
  calculateRecommendedPct,
  rankWeakUnits,
} from "@/modules/analytics/dashboard-metrics";
import {
  DASHBOARD_CATEGORY_COUNT_FIXTURE,
  DASHBOARD_CATEGORY_TIE_FIXTURE,
  DASHBOARD_CONSISTENCY_FIXTURE,
  DASHBOARD_DIFFICULTY_EXPECTED,
  DASHBOARD_DIFFICULTY_ITEMS_FIXTURE,
  DASHBOARD_TREND_ITEMS_FIXTURE,
  DASHBOARD_TREND_WEEKLY_BUCKETS_FIXTURE,
  DASHBOARD_WEAKNESS_ROWS_FIXTURE,
} from "../fixtures/dashboard-fixtures";

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

  it("returns 0 weighted accuracy for empty items", () => {
    expect(calculateDifficultyWeightedAccuracyPct([])).toBe(0);
  });

  it("uses default weight 3 for null difficulty and supports mixed weighted inputs", () => {
    expect(calculateDifficultyWeightedAccuracyPct(DASHBOARD_DIFFICULTY_ITEMS_FIXTURE)).toBe(
      DASHBOARD_DIFFICULTY_EXPECTED.weightedAccuracyPct,
    );

    expect(calculateDifficultyWeightedAccuracyPct(DASHBOARD_DIFFICULTY_ITEMS_FIXTURE.slice(0, 2))).toBe(62.5);
  });

  it("falls back to recent accuracy when consistency data has fewer than 2 points", () => {
    const { recentAccuracyFallback } = DASHBOARD_CONSISTENCY_FIXTURE;

    expect(calculateConsistencyPct([], recentAccuracyFallback)).toBe(recentAccuracyFallback);
    expect(calculateConsistencyPct([88.4], recentAccuracyFallback)).toBe(recentAccuracyFallback);
  });

  it("calculates consistency from weekly standard deviation and clamps to 0", () => {
    const { weeklyAccuracies, recentAccuracyFallback, expectedConsistencyPct } = DASHBOARD_CONSISTENCY_FIXTURE;

    expect(calculateConsistencyPct(weeklyAccuracies, recentAccuracyFallback)).toBe(expectedConsistencyPct);
    expect(calculateConsistencyPct([0, 100], recentAccuracyFallback)).toBe(0);
  });

  it("aggregates category counts with rounded ratios", () => {
    const distribution = calculateCategoryDistribution([...DASHBOARD_CATEGORY_COUNT_FIXTURE]);

    expect(distribution).toHaveLength(2);
    expect(distribution[0]).toMatchObject({
      key: "lack_of_concept",
      count: 2,
      ratio: 66.7,
    });
    expect(distribution[1]).toMatchObject({
      key: "misread_question",
      count: 1,
      ratio: 33.3,
    });
  });

  it("sorts category ties by key", () => {
    const distribution = calculateCategoryDistribution([...DASHBOARD_CATEGORY_TIE_FIXTURE]);

    expect(distribution.map((item) => item.key)).toEqual(["calculation_mistake", "misread_question"]);
  });

  it("builds trend points including range boundaries", () => {
    const points = buildTrendPoints(DASHBOARD_TREND_ITEMS_FIXTURE, DASHBOARD_TREND_WEEKLY_BUCKETS_FIXTURE);

    expect(points).toHaveLength(2);
    expect(points[0]).toEqual({
      weekStart: "2026-02-02",
      weekEnd: "2026-02-08",
      totalItems: 2,
      correctItems: 1,
      accuracyPct: 50,
      masteryScorePct: 51.9,
    });
    expect(points[1]).toEqual({
      weekStart: "2026-02-09",
      weekEnd: "2026-02-15",
      totalItems: 2,
      correctItems: 2,
      accuracyPct: 100,
      masteryScorePct: 100,
    });
  });

  it("returns 0 metrics for empty trend buckets", () => {
    const points = buildTrendPoints([], DASHBOARD_TREND_WEEKLY_BUCKETS_FIXTURE);

    expect(points).toHaveLength(2);
    expect(points.every((point) => point.totalItems === 0)).toBe(true);
    expect(points.every((point) => point.accuracyPct === 0)).toBe(true);
    expect(points.every((point) => point.masteryScorePct === 0)).toBe(true);
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
    const ranked = rankWeakUnits(DASHBOARD_WEAKNESS_ROWS_FIXTURE, 3, 5);

    expect(ranked).toHaveLength(2);
    expect(ranked[0].curriculumNodeId).toBe("unit-a");
    expect(ranked[0].accuracyPct).toBeCloseTo(33.3, 1);
    expect(ranked[1].curriculumNodeId).toBe("unit-b");
  });
});
