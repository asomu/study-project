import { clamp, daysInclusive, formatDateOnly, type WeeklyBucket } from "@/modules/dashboard/date-range";

type CorrectnessLike = {
  isCorrect: boolean;
  difficulty: number | null;
};

export type DashboardAttemptItemRecord = CorrectnessLike & {
  curriculumNodeId: string;
  attemptDate: Date;
};

export type WeaknessRow = {
  curriculumNodeId: string;
  unitName: string;
  isCorrect: boolean;
};

export type WeakUnit = {
  curriculumNodeId: string;
  unitName: string;
  attempts: number;
  accuracyPct: number;
  wrongCount: number;
};

export type CategoryDistribution = {
  key: string;
  labelKo: string;
  count: number;
  ratio: number;
};

export type TrendPoint = {
  weekStart: string;
  weekEnd: string;
  totalItems: number;
  correctItems: number;
  accuracyPct: number;
  masteryScorePct: number;
};

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function toPercentage(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0;
  }

  return clamp((numerator / denominator) * 100, 0, 100);
}

function calculatePopulationStddev(values: number[]) {
  if (values.length < 2) {
    return 0;
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;

  return Math.sqrt(variance);
}

export function calculateAccuracyPct(correctItems: number, totalItems: number) {
  return roundToOneDecimal(toPercentage(correctItems, totalItems));
}

export function calculateRecommendedPct(semesterStart: Date, semesterEnd: Date, asOfDate: Date) {
  const totalDays = daysInclusive(semesterStart, semesterEnd);

  if (!totalDays) {
    return 0;
  }

  const elapsedDays = clamp(daysInclusive(semesterStart, asOfDate), 0, totalDays);
  return roundToOneDecimal(toPercentage(elapsedDays, totalDays));
}

export function calculateActualPct(coveredUnits: number, totalUnits: number) {
  return roundToOneDecimal(toPercentage(coveredUnits, totalUnits));
}

export function calculateDifficultyWeightedAccuracyPct(items: CorrectnessLike[]) {
  if (!items.length) {
    return 0;
  }

  let weightedCorrect = 0;
  let weightedTotal = 0;

  for (const item of items) {
    const weight = item.difficulty ?? 3;
    weightedTotal += weight;

    if (item.isCorrect) {
      weightedCorrect += weight;
    }
  }

  return roundToOneDecimal(toPercentage(weightedCorrect, weightedTotal));
}

export function calculateConsistencyPct(weeklyAccuracyPcts: number[], recentAccuracyPct: number) {
  if (weeklyAccuracyPcts.length < 2) {
    return roundToOneDecimal(clamp(recentAccuracyPct, 0, 100));
  }

  const stddev = calculatePopulationStddev(weeklyAccuracyPcts);
  return roundToOneDecimal(clamp(100 - 2 * stddev, 0, 100));
}

export function calculateOverallScorePct({
  recentAccuracyPct,
  consistencyPct,
  difficultyWeightedAccuracyPct,
}: {
  recentAccuracyPct: number;
  consistencyPct: number;
  difficultyWeightedAccuracyPct: number;
}) {
  const raw = 0.6 * recentAccuracyPct + 0.25 * consistencyPct + 0.15 * difficultyWeightedAccuracyPct;
  return roundToOneDecimal(clamp(raw, 0, 100));
}

export function rankWeakUnits(rows: WeaknessRow[], minAttempts = 3, topN = 5): WeakUnit[] {
  const grouped = new Map<string, WeakUnit>();

  for (const row of rows) {
    const existing = grouped.get(row.curriculumNodeId);

    if (existing) {
      existing.attempts += 1;
      if (!row.isCorrect) {
        existing.wrongCount += 1;
      }
      continue;
    }

    grouped.set(row.curriculumNodeId, {
      curriculumNodeId: row.curriculumNodeId,
      unitName: row.unitName,
      attempts: 1,
      wrongCount: row.isCorrect ? 0 : 1,
      accuracyPct: 0,
    });
  }

  const ranked = Array.from(grouped.values())
    .map((item) => ({
      ...item,
      accuracyPct: calculateAccuracyPct(item.attempts - item.wrongCount, item.attempts),
    }))
    .filter((item) => item.attempts >= minAttempts)
    .sort((left, right) => {
      if (left.accuracyPct !== right.accuracyPct) {
        return left.accuracyPct - right.accuracyPct;
      }

      if (left.attempts !== right.attempts) {
        return right.attempts - left.attempts;
      }

      return left.unitName.localeCompare(right.unitName, "ko");
    });

  return ranked.slice(0, topN);
}

export function calculateCategoryDistribution(
  categories: Array<{
    key: string;
    labelKo: string;
  }>,
): CategoryDistribution[] {
  if (!categories.length) {
    return [];
  }

  const grouped = new Map<string, CategoryDistribution>();

  for (const category of categories) {
    const existing = grouped.get(category.key);

    if (existing) {
      existing.count += 1;
      continue;
    }

    grouped.set(category.key, {
      key: category.key,
      labelKo: category.labelKo,
      count: 1,
      ratio: 0,
    });
  }

  const total = categories.length;

  return Array.from(grouped.values())
    .map((entry) => ({
      ...entry,
      ratio: roundToOneDecimal(toPercentage(entry.count, total)),
    }))
    .sort((left, right) => {
      if (left.count !== right.count) {
        return right.count - left.count;
      }

      return left.key.localeCompare(right.key);
    });
}

export function buildTrendPoints(items: DashboardAttemptItemRecord[], weeklyBuckets: WeeklyBucket[]): TrendPoint[] {
  return weeklyBuckets.map((bucket) => {
    const bucketItems = items.filter(
      (item) => item.attemptDate >= bucket.rangeStart && item.attemptDate <= bucket.rangeEnd,
    );
    const totalItems = bucketItems.length;
    const correctItems = bucketItems.filter((item) => item.isCorrect).length;
    const accuracyPct = calculateAccuracyPct(correctItems, totalItems);
    const difficultyWeightedAccuracyPct = calculateDifficultyWeightedAccuracyPct(bucketItems);
    const masteryScorePct = calculateOverallScorePct({
      recentAccuracyPct: accuracyPct,
      consistencyPct: accuracyPct,
      difficultyWeightedAccuracyPct,
    });

    return {
      weekStart: formatDateOnly(bucket.weekStart),
      weekEnd: formatDateOnly(bucket.weekEnd),
      totalItems,
      correctItems,
      accuracyPct,
      masteryScorePct,
    };
  });
}
