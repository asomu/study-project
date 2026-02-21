import { SchoolLevel, Subject } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

export const curriculumQuerySchema = z.object({
  schoolLevel: z.nativeEnum(SchoolLevel),
  subject: z.nativeEnum(Subject).default(Subject.math),
  grade: z.coerce.number().int().min(1).max(12),
  semester: z.coerce.number().int().min(1).max(2),
  asOfDate: z
    .string()
    .trim()
    .regex(dateOnlyPattern, "asOfDate must be formatted as YYYY-MM-DD"),
  curriculumVersion: z.string().trim().min(1).optional(),
});

export type CurriculumQuery = z.infer<typeof curriculumQuerySchema>;

function parseDateOnly(value: string) {
  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function toEffectiveDateRange(nodes: Array<{ activeFrom: Date; activeTo: Date | null }>) {
  const effectiveFrom = nodes.reduce((min, node) => {
    if (!min || node.activeFrom < min) {
      return node.activeFrom;
    }

    return min;
  }, null as Date | null);

  const hasOpenEnded = nodes.some((node) => node.activeTo === null);
  const effectiveTo = hasOpenEnded
    ? null
    : nodes.reduce((max, node) => {
        if (!node.activeTo) {
          return max;
        }

        if (!max || node.activeTo > max) {
          return node.activeTo;
        }

        return max;
      }, null as Date | null);

  return {
    effectiveFrom,
    effectiveTo,
  };
}

export function parseCurriculumQuery(url: URL) {
  return curriculumQuerySchema.safeParse({
    schoolLevel: url.searchParams.get("schoolLevel"),
    subject: url.searchParams.get("subject") ?? Subject.math,
    grade: url.searchParams.get("grade"),
    semester: url.searchParams.get("semester"),
    asOfDate: url.searchParams.get("asOfDate"),
    curriculumVersion: url.searchParams.get("curriculumVersion") ?? undefined,
  });
}

export async function findCurriculumByQuery(query: CurriculumQuery) {
  const asOfDate = parseDateOnly(query.asOfDate);

  if (!asOfDate) {
    return null;
  }

  const baseWhere = {
    schoolLevel: query.schoolLevel,
    subject: query.subject,
    grade: query.grade,
    semester: query.semester,
  };

  if (query.curriculumVersion) {
    const nodes = await prisma.curriculumNode.findMany({
      where: {
        ...baseWhere,
        curriculumVersion: query.curriculumVersion,
      },
      orderBy: [{ sortOrder: "asc" }, { unitCode: "asc" }],
    });

    if (!nodes.length) {
      return null;
    }

    const range = toEffectiveDateRange(nodes);

    return {
      nodes,
      meta: {
        curriculumVersion: query.curriculumVersion,
        effectiveFrom: range.effectiveFrom,
        effectiveTo: range.effectiveTo,
      },
    };
  }

  const activeNodes = await prisma.curriculumNode.findMany({
    where: {
      ...baseWhere,
      activeFrom: {
        lte: asOfDate,
      },
      OR: [{ activeTo: null }, { activeTo: { gte: asOfDate } }],
    },
    orderBy: [{ curriculumVersion: "desc" }, { sortOrder: "asc" }, { unitCode: "asc" }],
  });

  if (!activeNodes.length) {
    return null;
  }

  const resolvedVersion = activeNodes[0].curriculumVersion;
  const nodes = activeNodes.filter((node) => node.curriculumVersion === resolvedVersion);
  const range = toEffectiveDateRange(nodes);

  return {
    nodes,
    meta: {
      curriculumVersion: resolvedVersion,
      effectiveFrom: range.effectiveFrom,
      effectiveTo: range.effectiveTo,
    },
  };
}
