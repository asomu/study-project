import { PracticeProblemType, SchoolLevel, StudyProgressStatus } from "@prisma/client";
import { z } from "zod";

export const createStudySessionSchema = z.object({
  practiceSetId: z.string().trim().min(1),
});

export const submitStudySessionSchema = z.object({
  elapsedSeconds: z.number().int().min(0).max(8 * 60 * 60).optional(),
  canvasImageDataUrl: z.string().trim().min(1).optional(),
  answers: z
    .array(
      z.object({
        practiceProblemId: z.string().trim().min(1),
        studentAnswer: z.string().trim().max(500),
      }),
    )
    .min(1)
    .max(100),
});

export const listStudyReviewsQuerySchema = z.object({
  studentId: z.string().trim().min(1),
});

export const createStudyReviewSchema = z.object({
  feedback: z.string().trim().min(1).max(1000),
  progressStatus: z.nativeEnum(StudyProgressStatus),
});

export const listStudyProgressQuerySchema = z.object({
  studentId: z.string().trim().min(1),
});

export const updateStudyProgressSchema = z.object({
  studentId: z.string().trim().min(1),
  status: z.nativeEnum(StudyProgressStatus),
  note: z.string().trim().max(500).optional(),
});

export const updateStudentWrongAnswerSchema = z
  .object({
    memo: z.string().trim().max(1000).optional(),
    categoryKeys: z.array(z.string().trim().min(1)).max(10).optional(),
  })
  .refine((payload) => payload.memo !== undefined || payload.categoryKeys !== undefined, {
    message: "memo or categoryKeys is required",
    path: ["memo"],
  });

export const practiceProblemResponseSchema = z.object({
  id: z.string(),
  problemNo: z.number().int(),
  type: z.nativeEnum(PracticeProblemType),
  prompt: z.string(),
  choices: z.array(z.string()).nullable(),
  explanation: z.string().nullable(),
  difficulty: z.number().int(),
  skillTags: z.array(z.string()),
});

export const studyContentFilterSchema = z.object({
  schoolLevel: z.nativeEnum(SchoolLevel),
  grade: z.coerce.number().int().min(1).max(12),
  semester: z.coerce.number().int().min(1).max(2),
});

const practiceProblemInputSchema = z
  .object({
    problemNo: z.number().int().min(1).max(999),
    type: z.nativeEnum(PracticeProblemType),
    prompt: z.string().trim().min(1).max(1000),
    choices: z.array(z.string().trim().min(1).max(200)).nullable(),
    correctAnswer: z.string().trim().min(1).max(300),
    explanation: z.string().trim().max(1000).nullable().optional(),
    skillTags: z.array(z.string().trim().min(1).max(50)).max(20),
    difficulty: z.number().int().min(1).max(5),
  })
  .superRefine((problem, context) => {
    if (problem.type === PracticeProblemType.single_choice) {
      const choices = problem.choices ?? [];

      if (choices.length < 2) {
        context.addIssue({
          code: "custom",
          message: "single_choice problems require at least 2 choices",
          path: ["choices"],
        });
      }

      if (!choices.includes(problem.correctAnswer)) {
        context.addIssue({
          code: "custom",
          message: "correctAnswer must match one of the choices",
          path: ["correctAnswer"],
        });
      }

      return;
    }

    if (problem.choices !== null) {
      context.addIssue({
        code: "custom",
        message: "short_answer problems must not provide choices",
        path: ["choices"],
      });
    }
  });

export const practiceSetUpsertSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(500).nullable().optional(),
    schoolLevel: z.nativeEnum(SchoolLevel),
    grade: z.number().int().min(1).max(12),
    semester: z.number().int().min(1).max(2),
    curriculumNodeId: z.string().trim().min(1),
    sortOrder: z.number().int().min(0).max(999),
    isActive: z.boolean(),
    problems: z.array(practiceProblemInputSchema).min(1).max(100),
  })
  .superRefine((payload, context) => {
    const seenProblemNumbers = new Set<number>();

    payload.problems.forEach((problem, index) => {
      if (seenProblemNumbers.has(problem.problemNo)) {
        context.addIssue({
          code: "custom",
          message: "problemNo must be unique within a practice set",
          path: ["problems", index, "problemNo"],
        });
      }

      seenProblemNumbers.add(problem.problemNo);
    });
  });

export const practiceSetActivationSchema = z.object({
  isActive: z.boolean(),
});

const conceptHeadlineBlockSchema = z.object({
  type: z.literal("headline"),
  text: z.string().trim().min(1).max(1000),
});

const conceptVisualHintBlockSchema = z.object({
  type: z.literal("visual_hint"),
  text: z.string().trim().min(1).max(1000),
});

const conceptStepsBlockSchema = z.object({
  type: z.literal("steps"),
  items: z.array(z.string().trim().min(1).max(500)).min(1).max(20),
});

const conceptTableBlockSchema = z.object({
  type: z.literal("table"),
  rows: z
    .array(z.tuple([z.string().trim().min(1).max(300), z.string().trim().min(1).max(1000)]))
    .min(1)
    .max(20),
});

export const conceptContentSchema = z.object({
  blocks: z
    .array(
      z.discriminatedUnion("type", [
        conceptHeadlineBlockSchema,
        conceptVisualHintBlockSchema,
        conceptStepsBlockSchema,
        conceptTableBlockSchema,
      ]),
    )
    .min(1)
    .max(30),
});

export const conceptLessonUpsertSchema = z.object({
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().max(500).nullable().optional(),
  content: conceptContentSchema,
});

export function parseStudyReviewsQuery(url: URL) {
  return listStudyReviewsQuerySchema.safeParse({
    studentId: url.searchParams.get("studentId"),
  });
}

export function parseStudyProgressQuery(url: URL) {
  return listStudyProgressQuerySchema.safeParse({
    studentId: url.searchParams.get("studentId"),
  });
}

export function parseStudyContentQuery(url: URL) {
  return studyContentFilterSchema.safeParse({
    schoolLevel: url.searchParams.get("schoolLevel"),
    grade: url.searchParams.get("grade"),
    semester: url.searchParams.get("semester"),
  });
}
