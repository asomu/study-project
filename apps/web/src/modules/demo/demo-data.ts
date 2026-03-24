import { Buffer } from "node:buffer";
import { access, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { WorkbookProgressStatus, WrongNoteReason, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { addDaysUtc, formatDateOnly, startOfDayUtc } from "@/modules/dashboard/date-range";
import { getWrongNoteStorageRoot, resolveWrongNoteImageLocation, saveWrongNoteImage } from "@/modules/shared/wrong-note-storage";

export const DEMO_GUARDIAN_EMAIL = "guardian@example.com";
export const DEMO_STUDENT_ID = "11111111-1111-4111-8111-111111111111";
export const DEMO_STUDENT_WORKBOOK_ID = "71717171-7171-4717-8717-717171717171";
export const DEMO_CURRICULUM_VERSION = "2022.12";

const DEMO_CURRICULUM_NODE_IDS = {
  primeFactorization: "22222222-2222-4222-8222-222222222222",
  integersAndRationals: "33333333-3333-4333-8333-333333333333",
  expressions: "44444444-4444-4444-8444-444444444444",
  linearEquations: "55555555-5555-4555-8555-555555555555",
} as const;

const DEMO_STAGE_IDS = {
  concept: "81818181-8181-4818-8818-818181818181",
  core: "82828282-8282-4828-8828-828282828282",
  finish: "83838383-8383-4838-8838-838383838383",
} as const;

const DEMO_IMAGE_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5x0L8AAAAASUVORK5CYII=",
  "base64",
);

const DEMO_PROGRESS_ROWS = [
  {
    id: "a1111111-1111-4111-8111-111111111111",
    curriculumNodeId: DEMO_CURRICULUM_NODE_IDS.primeFactorization,
    workbookTemplateStageId: DEMO_STAGE_IDS.concept,
    status: WorkbookProgressStatus.completed,
    offsetDays: -6,
  },
  {
    id: "a2222222-2222-4222-8222-222222222222",
    curriculumNodeId: DEMO_CURRICULUM_NODE_IDS.primeFactorization,
    workbookTemplateStageId: DEMO_STAGE_IDS.core,
    status: WorkbookProgressStatus.completed,
    offsetDays: -5,
  },
  {
    id: "a3333333-3333-4333-8333-333333333333",
    curriculumNodeId: DEMO_CURRICULUM_NODE_IDS.integersAndRationals,
    workbookTemplateStageId: DEMO_STAGE_IDS.concept,
    status: WorkbookProgressStatus.in_progress,
    offsetDays: -2,
  },
] as const;

const DEMO_WRONG_NOTES = [
  {
    id: "b1111111-1111-4111-8111-111111111111",
    curriculumNodeId: DEMO_CURRICULUM_NODE_IDS.integersAndRationals,
    reason: WrongNoteReason.misread_question,
    studentMemo: "조건의 음수를 끝까지 확인하지 않았어요.",
    studentWorkbookId: DEMO_STUDENT_WORKBOOK_ID,
    workbookTemplateStageId: DEMO_STAGE_IDS.core,
    guardianFeedback: null,
    guardianFeedbackAt: null,
    offsetDays: -7,
  },
  {
    id: "b2222222-2222-4222-8222-222222222222",
    curriculumNodeId: DEMO_CURRICULUM_NODE_IDS.linearEquations,
    reason: WrongNoteReason.lack_of_concept,
    studentMemo: "이항 순서를 헷갈렸어요.",
    studentWorkbookId: DEMO_STUDENT_WORKBOOK_ID,
    workbookTemplateStageId: DEMO_STAGE_IDS.finish,
    guardianFeedback: "등식의 양변에 같은 계산을 적용하는 흐름을 한 줄씩 다시 써보자.",
    guardianFeedbackAt: -1,
    offsetDays: -1,
  },
  {
    id: "b3333333-3333-4333-8333-333333333333",
    curriculumNodeId: DEMO_CURRICULUM_NODE_IDS.expressions,
    reason: WrongNoteReason.calculation_mistake,
    studentMemo: "괄호를 풀 때 부호를 바꿔야 했어요.",
    studentWorkbookId: null,
    workbookTemplateStageId: null,
    guardianFeedback: null,
    guardianFeedbackAt: null,
    offsetDays: -12,
  },
] as const;

export type DemoSeedResult = {
  studentId: string;
  referenceDate: string;
  wrongNoteCount: number;
  progressRowCount: number;
  studentWorkbookId: string;
};

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

function resolveReferenceDate(input?: Date) {
  if (input) {
    return startOfDayUtc(input);
  }

  const configured = process.env.DEMO_REFERENCE_DATE;

  if (!configured) {
    return startOfDayUtc(new Date());
  }

  if (!dateOnlyPattern.test(configured)) {
    throw new Error("DEMO_REFERENCE_DATE must be formatted as YYYY-MM-DD");
  }

  const parsed = new Date(`${configured}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime()) || formatDateOnly(parsed) !== configured) {
    throw new Error("DEMO_REFERENCE_DATE must be formatted as YYYY-MM-DD");
  }

  return startOfDayUtc(parsed);
}

async function removeExistingDemoImageFiles(client: PrismaClient) {
  const existingWrongNotes = await client.wrongNote.findMany({
    where: {
      studentId: DEMO_STUDENT_ID,
    },
    select: {
      imagePath: true,
    },
  });

  await Promise.all(
    existingWrongNotes
      .map((wrongNote) => wrongNote.imagePath)
      .filter((imagePath): imagePath is string => Boolean(imagePath))
      .map(async (imagePath) => {
        const resolved = resolveWrongNoteImageLocation(imagePath);

        if (!resolved) {
          return;
        }

        try {
          await access(resolved.absolutePath);
          await rm(resolved.absolutePath, { force: true });
        } catch {
          // Demo cleanup should tolerate missing files.
        }
      }),
  );

  await rm(resolve(getWrongNoteStorageRoot(), DEMO_STUDENT_ID), {
    recursive: true,
    force: true,
  });
}

async function ensureBaseRecords(client: PrismaClient) {
  const guardianEmail = process.env.SEED_GUARDIAN_EMAIL ?? DEMO_GUARDIAN_EMAIL;
  const [guardian, student, studentWorkbook] = await Promise.all([
    client.user.findUnique({
      where: {
        email: guardianEmail,
      },
    }),
    client.student.findUnique({
      where: {
        id: DEMO_STUDENT_ID,
      },
    }),
    client.studentWorkbook.findUnique({
      where: {
        id: DEMO_STUDENT_WORKBOOK_ID,
      },
      include: {
        workbookTemplate: {
          include: {
            stages: true,
          },
        },
      },
    }),
  ]);

  if (!guardian) {
    throw new Error(`Seed guardian not found for ${guardianEmail}. Run prisma migrate deploy and prisma:seed first.`);
  }

  if (!student) {
    throw new Error(`Seed student ${DEMO_STUDENT_ID} not found. Run prisma migrate deploy and prisma:seed first.`);
  }

  if (!studentWorkbook || studentWorkbook.studentId !== DEMO_STUDENT_ID) {
    throw new Error(`Seed student workbook ${DEMO_STUDENT_WORKBOOK_ID} not found for demo student.`);
  }

  return {
    guardian,
    student,
    studentWorkbook,
  };
}

export async function clearDemoData(client: PrismaClient = prisma) {
  await removeExistingDemoImageFiles(client);

  await client.$transaction(async (tx) => {
    await tx.wrongNote.deleteMany({
      where: {
        studentId: DEMO_STUDENT_ID,
      },
    });

    await tx.studentWorkbookProgress.deleteMany({
      where: {
        studentWorkbook: {
          studentId: DEMO_STUDENT_ID,
        },
      },
    });
  });
}

export async function seedDemoData(options?: { client?: PrismaClient; referenceDate?: Date }): Promise<DemoSeedResult> {
  const client = options?.client ?? prisma;
  const referenceDate = resolveReferenceDate(options?.referenceDate);
  const { guardian } = await ensureBaseRecords(client);

  await clearDemoData(client);

  await client.$transaction(async (tx) => {
    await tx.studentWorkbookProgress.createMany({
      data: DEMO_PROGRESS_ROWS.map((row) => {
        const lastUpdatedAt = addDaysUtc(referenceDate, row.offsetDays);

        return {
          id: row.id,
          studentWorkbookId: DEMO_STUDENT_WORKBOOK_ID,
          curriculumNodeId: row.curriculumNodeId,
          workbookTemplateStageId: row.workbookTemplateStageId,
          status: row.status,
          updatedByUserId: guardian.id,
          lastUpdatedAt,
          createdAt: lastUpdatedAt,
          updatedAt: lastUpdatedAt,
        };
      }),
    });

    for (const note of DEMO_WRONG_NOTES) {
      const createdAt = addDaysUtc(referenceDate, note.offsetDays);
      const guardianFeedbackAt =
        typeof note.guardianFeedbackAt === "number" ? addDaysUtc(referenceDate, note.guardianFeedbackAt) : null;
      const imagePath = await saveWrongNoteImage(DEMO_IMAGE_BUFFER, "image/png", DEMO_STUDENT_ID, note.id);

      await tx.wrongNote.create({
        data: {
          id: note.id,
          studentId: DEMO_STUDENT_ID,
          curriculumNodeId: note.curriculumNodeId,
          reason: note.reason,
          studentMemo: note.studentMemo,
          imagePath,
          studentWorkbookId: note.studentWorkbookId,
          workbookTemplateStageId: note.workbookTemplateStageId,
          guardianFeedback: note.guardianFeedback,
          guardianFeedbackByUserId: note.guardianFeedback ? guardian.id : null,
          guardianFeedbackAt,
          createdAt,
          updatedAt: guardianFeedbackAt ?? createdAt,
        },
      });
    }
  });

  return {
    studentId: DEMO_STUDENT_ID,
    referenceDate: formatDateOnly(referenceDate),
    wrongNoteCount: DEMO_WRONG_NOTES.length,
    progressRowCount: DEMO_PROGRESS_ROWS.length,
    studentWorkbookId: DEMO_STUDENT_WORKBOOK_ID,
  };
}
