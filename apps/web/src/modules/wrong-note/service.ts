import type { Prisma, WrongNoteReason } from "@prisma/client";
import { Subject } from "@prisma/client";
import { addDaysUtc, endOfDayUtc, startOfDayUtc } from "@/modules/dashboard/date-range";
import { WRONG_NOTE_REASON_OPTIONS } from "@/modules/wrong-note/constants";

type WrongNoteFilterParams = {
  studentId: string;
  semester?: number;
  curriculumNodeId?: string;
  reason?: WrongNoteReason;
  from?: Date | null;
  to?: Date | null;
  hasFeedback?: boolean;
};

type WrongNoteTopUnitInput = Array<{
  curriculumNodeId: string;
  unitName: string;
}>;

export function normalizeOptionalText(value: string | null | undefined) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length ? normalized : null;
}

export function buildWrongNoteWhere(filters: WrongNoteFilterParams): Prisma.WrongNoteWhereInput {
  return {
    studentId: filters.studentId,
    deletedAt: null,
    ...(filters.semester
      ? {
          curriculumNode: {
            semester: filters.semester,
          },
        }
      : {}),
    ...(filters.curriculumNodeId
      ? {
          curriculumNodeId: filters.curriculumNodeId,
        }
      : {}),
    ...(filters.reason
      ? {
          reason: filters.reason,
        }
      : {}),
    ...(filters.from || filters.to
      ? {
          createdAt: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: endOfDayUtc(filters.to) } : {}),
          },
        }
      : {}),
    ...(filters.hasFeedback === undefined
      ? {}
      : filters.hasFeedback
        ? {
            guardianFeedbackAt: {
              not: null,
            },
          }
        : {
            guardianFeedbackAt: null,
          }),
  };
}

export function buildWrongNotePagination(page: number, pageSize: number, totalItems: number) {
  return {
    page,
    pageSize,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
  };
}

export function createWrongNoteReasonCounts(): Record<WrongNoteReason, number> {
  return WRONG_NOTE_REASON_OPTIONS.reduce<Record<WrongNoteReason, number>>((result, option) => {
    result[option.key] = 0;
    return result;
  }, {} as Record<WrongNoteReason, number>);
}

export function buildWrongNoteReasonCounts(
  groups: Array<{
    reason: WrongNoteReason;
    _count: {
      _all: number;
    };
  }>,
) {
  const counts = createWrongNoteReasonCounts();

  for (const group of groups) {
    counts[group.reason] = group._count._all;
  }

  return counts;
}

export function buildWrongNoteTopUnits(items: WrongNoteTopUnitInput, limit = 5) {
  const grouped = items.reduce<
    Map<
      string,
      {
        curriculumNodeId: string;
        unitName: string;
        count: number;
      }
    >
  >((result, item) => {
    const existing = result.get(item.curriculumNodeId);

    if (existing) {
      existing.count += 1;
      return result;
    }

    result.set(item.curriculumNodeId, {
      curriculumNodeId: item.curriculumNodeId,
      unitName: item.unitName,
      count: 1,
    });
    return result;
  }, new Map());

  return [...grouped.values()]
    .sort((left, right) => {
      if (left.count !== right.count) {
        return right.count - left.count;
      }

      return left.unitName.localeCompare(right.unitName, "ko");
    })
    .slice(0, limit);
}

export function getWrongNoteRecent30DaysStart(asOfDate = startOfDayUtc(new Date())) {
  return addDaysUtc(asOfDate, -29);
}

export function getWrongNoteCurriculumNodeWhere(params: {
  student: {
    schoolLevel: "elementary" | "middle" | "high";
    grade: number;
  };
  curriculumNodeId: string;
  semester: number;
  asOfDate?: Date;
}): Prisma.CurriculumNodeWhereInput {
  const asOfDate = startOfDayUtc(params.asOfDate ?? new Date());

  return {
    id: params.curriculumNodeId,
    schoolLevel: params.student.schoolLevel,
    subject: Subject.math,
    grade: params.student.grade,
    semester: params.semester,
    activeFrom: {
      lte: asOfDate,
    },
    OR: [
      {
        activeTo: null,
      },
      {
        activeTo: {
          gte: asOfDate,
        },
      },
    ],
  };
}
