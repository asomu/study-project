import type { Prisma } from "@prisma/client";

export type WrongAnswerWithRelations = Prisma.WrongAnswerGetPayload<{
  include: {
    categories: {
      include: {
        category: true;
      };
    };
    attemptItem: {
      include: {
        attempt: true;
      };
    };
  };
}>;

export function serializeWrongAnswer(record: WrongAnswerWithRelations) {
  return {
    id: record.id,
    attemptItemId: record.attemptItemId,
    memo: record.memo,
    imagePath: record.imagePath,
    reviewedAt: record.reviewedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    categories: record.categories.map((entry) => ({
      id: entry.categoryId,
      key: entry.category.key,
      labelKo: entry.category.labelKo,
    })),
    attemptItem: {
      id: record.attemptItem.id,
      attemptId: record.attemptItem.attemptId,
      curriculumNodeId: record.attemptItem.curriculumNodeId,
      problemNo: record.attemptItem.problemNo,
      isCorrect: record.attemptItem.isCorrect,
      difficulty: record.attemptItem.difficulty,
      attemptDate: record.attemptItem.attempt.attemptDate,
    },
  };
}
