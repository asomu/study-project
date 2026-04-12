const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

export type SemesterRange = {
  semester: 1 | 2;
  start: Date;
  end: Date;
  totalDays: number;
};

export type WeeklyBucket = {
  weekStart: Date;
  weekEnd: Date;
  rangeStart: Date;
  rangeEnd: Date;
};

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function startOfDayUtc(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function endOfDayUtc(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 23, 59, 59, 999));
}

export function addDaysUtc(value: Date, days: number) {
  const result = startOfDayUtc(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function daysInclusive(start: Date, end: Date) {
  const normalizedStart = startOfDayUtc(start).getTime();
  const normalizedEnd = startOfDayUtc(end).getTime();

  if (normalizedEnd < normalizedStart) {
    return 0;
  }

  const oneDayMs = 24 * 60 * 60 * 1000;
  return Math.floor((normalizedEnd - normalizedStart) / oneDayMs) + 1;
}

export function parseDateOnly(value: string) {
  if (!dateOnlyPattern.test(value)) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  if (formatDateOnly(parsed) !== value) {
    return null;
  }

  return parsed;
}

export function formatDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function getSemesterRange(asOfDate: Date): SemesterRange {
  const year = asOfDate.getUTCFullYear();
  const semester = asOfDate.getUTCMonth() < 6 ? 1 : 2;
  const start = semester === 1 ? new Date(Date.UTC(year, 0, 1)) : new Date(Date.UTC(year, 6, 1));
  const end = semester === 1 ? new Date(Date.UTC(year, 5, 30)) : new Date(Date.UTC(year, 11, 31));

  return {
    semester,
    start,
    end,
    totalDays: daysInclusive(start, end),
  };
}

export function startOfWeekMondayUtc(value: Date) {
  const normalized = startOfDayUtc(value);
  const day = normalized.getUTCDay();
  const offset = (day + 6) % 7;
  normalized.setUTCDate(normalized.getUTCDate() - offset);
  return normalized;
}

export function endOfWeekSundayUtc(value: Date) {
  const monday = startOfWeekMondayUtc(value);
  monday.setUTCDate(monday.getUTCDate() + 6);
  return endOfDayUtc(monday);
}

export function listWeeklyBuckets(rangeStartInput: Date, rangeEndInput: Date): WeeklyBucket[] {
  const rangeStart = startOfDayUtc(rangeStartInput);
  const rangeEnd = endOfDayUtc(rangeEndInput);

  if (rangeStart > rangeEnd) {
    return [];
  }

  const buckets: WeeklyBucket[] = [];
  let cursor = startOfWeekMondayUtc(rangeStart);

  while (cursor <= rangeEnd) {
    const weekStart = startOfDayUtc(cursor);
    const weekEnd = endOfWeekSundayUtc(cursor);
    const bucketStart = weekStart < rangeStart ? rangeStart : weekStart;
    const bucketEnd = weekEnd > rangeEnd ? rangeEnd : weekEnd;

    buckets.push({
      weekStart,
      weekEnd,
      rangeStart: bucketStart,
      rangeEnd: bucketEnd,
    });

    cursor = addDaysUtc(cursor, 7);
  }

  return buckets;
}
