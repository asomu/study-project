import { Subject } from "@prisma/client";
import { z } from "zod";

export const createMaterialSchema = z
  .object({
    studentId: z.string().trim().min(1),
    title: z.string().trim().min(1).max(120),
    publisher: z.string().trim().min(1).max(120),
    subject: z.nativeEnum(Subject).default(Subject.math),
    grade: z.number().int().min(1).max(12),
    semester: z.number().int().min(1).max(2),
  })
  .refine((data) => data.subject === Subject.math, {
    message: "M2 accepts only math subject",
    path: ["subject"],
  });

export const createAttemptSchema = z.object({
  studentId: z.string().trim().min(1),
  materialId: z.string().trim().min(1),
  attemptDate: z.string().trim().min(1),
  notes: z.string().trim().max(1000).optional(),
});

export const createAttemptItemsSchema = z.object({
  items: z
    .array(
      z.object({
        curriculumNodeId: z.string().trim().min(1),
        problemNo: z.number().int().min(1),
        isCorrect: z.boolean(),
        difficulty: z.number().int().min(1).max(5).optional().nullable(),
      }),
    )
    .min(1)
    .max(200),
});

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
export type CreateAttemptInput = z.infer<typeof createAttemptSchema>;
export type CreateAttemptItemsInput = z.infer<typeof createAttemptItemsSchema>;
