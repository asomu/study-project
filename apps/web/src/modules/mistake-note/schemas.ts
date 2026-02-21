import { z } from "zod";

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

export const createWrongAnswerSchema = z.object({
  attemptItemId: z.string().trim().min(1),
  memo: z.string().trim().max(1000).optional(),
});

export const listWrongAnswersQuerySchema = z.object({
  studentId: z.string().trim().min(1),
  from: z
    .string()
    .trim()
    .regex(dateOnlyPattern, "from must be formatted as YYYY-MM-DD")
    .optional(),
  to: z
    .string()
    .trim()
    .regex(dateOnlyPattern, "to must be formatted as YYYY-MM-DD")
    .optional(),
  categoryKey: z.string().trim().min(1).optional(),
});

export const updateWrongAnswerCategoriesSchema = z.object({
  categoryKeys: z.array(z.string().trim().min(1)).max(10),
});

export function parseListWrongAnswersQuery(url: URL) {
  return listWrongAnswersQuerySchema.safeParse({
    studentId: url.searchParams.get("studentId"),
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    categoryKey: url.searchParams.get("categoryKey") ?? undefined,
  });
}

export function parseDateOnly(value: string) {
  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}
