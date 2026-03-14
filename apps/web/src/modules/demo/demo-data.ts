import { mkdir, readdir, rm } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { SchoolLevel, Subject, type PrismaClient } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { getUploadDirectory } from "../mistake-note/upload";

export const DEMO_GUARDIAN_EMAIL = "guardian@example.com";
export const DEMO_STUDENT_ID = "11111111-1111-4111-8111-111111111111";
export const DEMO_CURRICULUM_VERSION = "2026.01";

const demoCurriculumNodes = [
  {
    id: "22222222-2222-4222-8222-222222222222",
    unitCode: "M1-S1-U1",
    unitName: "소인수분해",
    sortOrder: 1,
  },
  {
    id: "22222222-2222-4222-8222-222222222223",
    unitCode: "M1-S1-U2",
    unitName: "정수와 유리수",
    sortOrder: 2,
  },
  {
    id: "22222222-2222-4222-8222-222222222224",
    unitCode: "M1-S1-U3",
    unitName: "문자와 식",
    sortOrder: 3,
  },
  {
    id: "22222222-2222-4222-8222-222222222225",
    unitCode: "M1-S1-U4",
    unitName: "일차방정식",
    sortOrder: 4,
  },
  {
    id: "22222222-2222-4222-8222-222222222226",
    unitCode: "M1-S1-U5",
    unitName: "좌표평면과 그래프",
    sortOrder: 5,
  },
] as const;

const demoMaterials = [
  {
    id: "33333333-3333-4333-8333-333333333331",
    title: "개념 기본서 1-1",
    publisher: "데모출판",
  },
  {
    id: "33333333-3333-4333-8333-333333333332",
    title: "주간 복습 워크북",
    publisher: "데모출판",
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    title: "시험 대비 모의문제",
    publisher: "데모출판",
  },
] as const;

type DemoWrongAnswerSeed = {
  id: string;
  memo: string;
  categoryKeys?: string[];
};

type DemoItemSeed = {
  id: string;
  curriculumNodeId: string;
  problemNo: number;
  isCorrect: boolean;
  difficulty: number;
  wrongAnswer?: DemoWrongAnswerSeed;
};

type DemoAttemptSeed = {
  id: string;
  materialId: string;
  offsetDays: number;
  notes: string;
  items: DemoItemSeed[];
};

const demoAttempts: DemoAttemptSeed[] = [
  {
    id: "44444444-4444-4444-8444-444444444441",
    materialId: demoMaterials[0].id,
    offsetDays: -25,
    notes: "초반 진단 풀이",
    items: [
      {
        id: "55555555-5555-4555-8555-555555555501",
        curriculumNodeId: demoCurriculumNodes[0].id,
        problemNo: 1,
        isCorrect: false,
        difficulty: 2,
        wrongAnswer: {
          id: "66666666-6666-4666-8666-666666666601",
          memo: "소인수분해 개념을 헷갈림",
          categoryKeys: ["misread_question"],
        },
      },
      {
        id: "55555555-5555-4555-8555-555555555502",
        curriculumNodeId: demoCurriculumNodes[0].id,
        problemNo: 2,
        isCorrect: true,
        difficulty: 2,
      },
      {
        id: "55555555-5555-4555-8555-555555555503",
        curriculumNodeId: demoCurriculumNodes[1].id,
        problemNo: 3,
        isCorrect: false,
        difficulty: 3,
        wrongAnswer: {
          id: "66666666-6666-4666-8666-666666666602",
          memo: "음수 계산 규칙을 놓침",
          categoryKeys: ["lack_of_concept"],
        },
      },
      {
        id: "55555555-5555-4555-8555-555555555504",
        curriculumNodeId: demoCurriculumNodes[2].id,
        problemNo: 4,
        isCorrect: false,
        difficulty: 3,
        wrongAnswer: {
          id: "66666666-6666-4666-8666-666666666603",
          memo: "문자 식 세우기에서 실수",
          categoryKeys: ["lack_of_concept"],
        },
      },
    ],
  },
  {
    id: "44444444-4444-4444-8444-444444444442",
    materialId: demoMaterials[0].id,
    offsetDays: -21,
    notes: "기본 개념 재학습",
    items: [
      {
        id: "55555555-5555-4555-8555-555555555505",
        curriculumNodeId: demoCurriculumNodes[1].id,
        problemNo: 1,
        isCorrect: true,
        difficulty: 2,
      },
      {
        id: "55555555-5555-4555-8555-555555555506",
        curriculumNodeId: demoCurriculumNodes[1].id,
        problemNo: 2,
        isCorrect: true,
        difficulty: 2,
      },
      {
        id: "55555555-5555-4555-8555-555555555507",
        curriculumNodeId: demoCurriculumNodes[2].id,
        problemNo: 3,
        isCorrect: true,
        difficulty: 3,
      },
      {
        id: "55555555-5555-4555-8555-555555555508",
        curriculumNodeId: demoCurriculumNodes[3].id,
        problemNo: 4,
        isCorrect: false,
        difficulty: 4,
        wrongAnswer: {
          id: "66666666-6666-4666-8666-666666666604",
          memo: "방정식 정리 순서를 놓침",
          categoryKeys: ["lack_of_concept"],
        },
      },
    ],
  },
  {
    id: "44444444-4444-4444-8444-444444444443",
    materialId: demoMaterials[1].id,
    offsetDays: -17,
    notes: "주간 복습 1차",
    items: [
      {
        id: "55555555-5555-4555-8555-555555555509",
        curriculumNodeId: demoCurriculumNodes[0].id,
        problemNo: 1,
        isCorrect: true,
        difficulty: 2,
      },
      {
        id: "55555555-5555-4555-8555-555555555510",
        curriculumNodeId: demoCurriculumNodes[4].id,
        problemNo: 2,
        isCorrect: false,
        difficulty: 3,
        wrongAnswer: {
          id: "66666666-6666-4666-8666-666666666605",
          memo: "좌표 읽기에서 계산 실수",
          categoryKeys: ["calculation_mistake"],
        },
      },
      {
        id: "55555555-5555-4555-8555-555555555511",
        curriculumNodeId: demoCurriculumNodes[4].id,
        problemNo: 3,
        isCorrect: true,
        difficulty: 3,
      },
      {
        id: "55555555-5555-4555-8555-555555555512",
        curriculumNodeId: demoCurriculumNodes[3].id,
        problemNo: 4,
        isCorrect: false,
        difficulty: 4,
        wrongAnswer: {
          id: "66666666-6666-4666-8666-666666666606",
          memo: "등식 변형 과정에서 줄을 건너뜀",
          categoryKeys: ["misread_question"],
        },
      },
    ],
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    materialId: demoMaterials[1].id,
    offsetDays: -11,
    notes: "복습 후 확인 문제",
    items: [
      {
        id: "55555555-5555-4555-8555-555555555513",
        curriculumNodeId: demoCurriculumNodes[2].id,
        problemNo: 1,
        isCorrect: true,
        difficulty: 3,
      },
      {
        id: "55555555-5555-4555-8555-555555555514",
        curriculumNodeId: demoCurriculumNodes[3].id,
        problemNo: 2,
        isCorrect: true,
        difficulty: 4,
      },
      {
        id: "55555555-5555-4555-8555-555555555515",
        curriculumNodeId: demoCurriculumNodes[4].id,
        problemNo: 3,
        isCorrect: true,
        difficulty: 3,
      },
      {
        id: "55555555-5555-4555-8555-555555555516",
        curriculumNodeId: demoCurriculumNodes[4].id,
        problemNo: 4,
        isCorrect: false,
        difficulty: 3,
        wrongAnswer: {
          id: "66666666-6666-4666-8666-666666666607",
          memo: "그래프 좌표를 반대로 읽음",
          categoryKeys: ["lack_of_concept"],
        },
      },
    ],
  },
  {
    id: "44444444-4444-4444-8444-444444444445",
    materialId: demoMaterials[2].id,
    offsetDays: -6,
    notes: "최근 7일 보강 학습",
    items: [
      {
        id: "55555555-5555-4555-8555-555555555517",
        curriculumNodeId: demoCurriculumNodes[3].id,
        problemNo: 1,
        isCorrect: false,
        difficulty: 4,
        wrongAnswer: {
          id: "66666666-6666-4666-8666-666666666608",
          memo: "문제를 급하게 읽어 방정식을 잘못 세움",
          categoryKeys: ["misread_question"],
        },
      },
      {
        id: "55555555-5555-4555-8555-555555555518",
        curriculumNodeId: demoCurriculumNodes[3].id,
        problemNo: 2,
        isCorrect: false,
        difficulty: 4,
        wrongAnswer: {
          id: "66666666-6666-4666-8666-666666666609",
          memo: "이항 규칙 이해가 아직 불안정",
          categoryKeys: ["lack_of_concept"],
        },
      },
      {
        id: "55555555-5555-4555-8555-555555555519",
        curriculumNodeId: demoCurriculumNodes[2].id,
        problemNo: 3,
        isCorrect: true,
        difficulty: 3,
      },
      {
        id: "55555555-5555-4555-8555-555555555520",
        curriculumNodeId: demoCurriculumNodes[4].id,
        problemNo: 4,
        isCorrect: false,
        difficulty: 3,
        wrongAnswer: {
          id: "66666666-6666-4666-8666-666666666610",
          memo: "좌표 순서를 헷갈려 다시 틀림",
          categoryKeys: ["misread_question"],
        },
      },
    ],
  },
  {
    id: "44444444-4444-4444-8444-444444444446",
    materialId: demoMaterials[2].id,
    offsetDays: -1,
    notes: "데모 직전 최종 점검",
    items: [
      {
        id: "55555555-5555-4555-8555-555555555521",
        curriculumNodeId: demoCurriculumNodes[3].id,
        problemNo: 1,
        isCorrect: false,
        difficulty: 4,
        wrongAnswer: {
          id: "66666666-6666-4666-8666-666666666611",
          memo: "최근 오답 예시 1",
        },
      },
      {
        id: "55555555-5555-4555-8555-555555555522",
        curriculumNodeId: demoCurriculumNodes[3].id,
        problemNo: 2,
        isCorrect: false,
        difficulty: 4,
        wrongAnswer: {
          id: "66666666-6666-4666-8666-666666666612",
          memo: "최근 오답 예시 2",
        },
      },
      {
        id: "55555555-5555-4555-8555-555555555523",
        curriculumNodeId: demoCurriculumNodes[3].id,
        problemNo: 3,
        isCorrect: true,
        difficulty: 4,
      },
      {
        id: "55555555-5555-4555-8555-555555555524",
        curriculumNodeId: demoCurriculumNodes[0].id,
        problemNo: 4,
        isCorrect: true,
        difficulty: 2,
      },
    ],
  },
];

const demoCategorySeed = [
  { key: "calculation_mistake", labelKo: "단순 연산 실수" },
  { key: "misread_question", labelKo: "문제 잘못 읽음" },
  { key: "lack_of_concept", labelKo: "문제 이해 못함" },
] as const;

export type DemoSeedResult = {
  studentId: string;
  referenceDate: string;
  materialCount: number;
  attemptCount: number;
  itemCount: number;
  wrongAnswerCount: number;
};

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

function toDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function startOfDayUtc(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function addDaysUtc(value: Date, days: number) {
  const result = startOfDayUtc(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

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

  if (Number.isNaN(parsed.getTime()) || toDateOnly(parsed) !== configured) {
    throw new Error("DEMO_REFERENCE_DATE must be formatted as YYYY-MM-DD");
  }

  return startOfDayUtc(parsed);
}

async function ensureBaseGuardianAndStudent(client: PrismaClient) {
  const guardianEmail = process.env.SEED_GUARDIAN_EMAIL ?? DEMO_GUARDIAN_EMAIL;
  const guardian = await client.user.findUnique({
    where: {
      email: guardianEmail,
    },
  });

  if (!guardian) {
    throw new Error(`Seed guardian not found for ${guardianEmail}. Run prisma migrate deploy and prisma:seed first.`);
  }

  const student = await client.student.findUnique({
    where: {
      id: DEMO_STUDENT_ID,
    },
  });

  if (!student) {
    throw new Error(`Seed student ${DEMO_STUDENT_ID} not found. Run prisma migrate deploy and prisma:seed first.`);
  }

  return {
    guardian,
    student,
  };
}

async function ensureDemoCategories(client: PrismaClient) {
  for (const category of demoCategorySeed) {
    await client.wrongAnswerCategory.upsert({
      where: {
        key: category.key,
      },
      update: {
        labelKo: category.labelKo,
      },
      create: {
        key: category.key,
        labelKo: category.labelKo,
      },
    });
  }
}

async function ensureDemoCurriculumNodes(client: PrismaClient) {
  for (const node of demoCurriculumNodes) {
    await client.curriculumNode.upsert({
      where: {
        id: node.id,
      },
      update: {
        curriculumVersion: DEMO_CURRICULUM_VERSION,
        schoolLevel: SchoolLevel.middle,
        subject: Subject.math,
        grade: 1,
        semester: 1,
        unitCode: node.unitCode,
        unitName: node.unitName,
        sortOrder: node.sortOrder,
        activeFrom: new Date("2026-01-01T00:00:00.000Z"),
        activeTo: null,
      },
      create: {
        id: node.id,
        curriculumVersion: DEMO_CURRICULUM_VERSION,
        schoolLevel: SchoolLevel.middle,
        subject: Subject.math,
        grade: 1,
        semester: 1,
        unitCode: node.unitCode,
        unitName: node.unitName,
        sortOrder: node.sortOrder,
        activeFrom: new Date("2026-01-01T00:00:00.000Z"),
        activeTo: null,
      },
    });
  }
}

async function removeDemoUploadFiles(fileHints: string[]) {
  const uploadDir = resolve(process.cwd(), getUploadDirectory());
  const demoWrongAnswerIds = new Set(
    demoAttempts.flatMap((attempt) =>
      attempt.items
        .map((item) => item.wrongAnswer?.id ?? null)
        .filter((value): value is string => value !== null),
    ),
  );

  await mkdir(uploadDir, { recursive: true });

  const entries = await readdir(uploadDir, { withFileTypes: true });
  const hintedFileNames = new Set(fileHints.map((value) => basename(value)).filter(Boolean));

  await Promise.all(
    entries
      .filter((entry) => {
        if (!entry.isFile()) {
          return false;
        }

        return hintedFileNames.has(entry.name) || Array.from(demoWrongAnswerIds).some((wrongAnswerId) => entry.name.startsWith(`${wrongAnswerId}-`));
      })
      .map((entry) =>
        rm(resolve(uploadDir, entry.name), {
          force: true,
        }),
      ),
  );
}

export async function clearDemoData(client: PrismaClient = prisma) {
  const existingWrongAnswers = await client.wrongAnswer.findMany({
    where: {
      attemptItem: {
        attempt: {
          studentId: DEMO_STUDENT_ID,
        },
      },
    },
    select: {
      imagePath: true,
    },
  });

  await client.$transaction(async (tx) => {
    await tx.wrongAnswerCategoryMap.deleteMany({
      where: {
        wrongAnswer: {
          attemptItem: {
            attempt: {
              studentId: DEMO_STUDENT_ID,
            },
          },
        },
      },
    });

    await tx.wrongAnswer.deleteMany({
      where: {
        attemptItem: {
          attempt: {
            studentId: DEMO_STUDENT_ID,
          },
        },
      },
    });

    await tx.attemptItem.deleteMany({
      where: {
        attempt: {
          studentId: DEMO_STUDENT_ID,
        },
      },
    });

    await tx.attempt.deleteMany({
      where: {
        studentId: DEMO_STUDENT_ID,
      },
    });

    await tx.material.deleteMany({
      where: {
        studentId: DEMO_STUDENT_ID,
      },
    });

    await tx.masterySnapshot.deleteMany({
      where: {
        studentId: DEMO_STUDENT_ID,
      },
    });
  });

  await removeDemoUploadFiles(
    existingWrongAnswers.map((entry) => entry.imagePath).filter((value): value is string => Boolean(value)),
  );
}

export async function seedDemoData(options?: { client?: PrismaClient; referenceDate?: Date }): Promise<DemoSeedResult> {
  const client = options?.client ?? prisma;
  const referenceDate = resolveReferenceDate(options?.referenceDate);

  await ensureBaseGuardianAndStudent(client);
  await ensureDemoCategories(client);
  await ensureDemoCurriculumNodes(client);
  await clearDemoData(client);

  await client.$transaction(async (tx) => {
    await tx.material.createMany({
      data: demoMaterials.map((material) => ({
        id: material.id,
        studentId: DEMO_STUDENT_ID,
        title: material.title,
        publisher: material.publisher,
        subject: Subject.math,
        schoolLevel: SchoolLevel.middle,
        grade: 1,
        semester: 1,
      })),
    });

    for (const attempt of demoAttempts) {
      const attemptDate = addDaysUtc(referenceDate, attempt.offsetDays);

      await tx.attempt.create({
        data: {
          id: attempt.id,
          studentId: DEMO_STUDENT_ID,
          materialId: attempt.materialId,
          attemptDate,
          notes: attempt.notes,
        },
      });

      for (const item of attempt.items) {
        await tx.attemptItem.create({
          data: {
            id: item.id,
            attemptId: attempt.id,
            curriculumNodeId: item.curriculumNodeId,
            problemNo: item.problemNo,
            isCorrect: item.isCorrect,
            difficulty: item.difficulty,
          },
        });

        if (!item.wrongAnswer) {
          continue;
        }

        await tx.wrongAnswer.create({
          data: {
            id: item.wrongAnswer.id,
            attemptItemId: item.id,
            memo: item.wrongAnswer.memo,
            categories: item.wrongAnswer.categoryKeys?.length
              ? {
                  create: item.wrongAnswer.categoryKeys.map((categoryKey) => ({
                    category: {
                      connect: {
                        key: categoryKey,
                      },
                    },
                  })),
                }
              : undefined,
          },
        });
      }
    }
  });

  const itemCount = demoAttempts.reduce((sum, attempt) => sum + attempt.items.length, 0);
  const wrongAnswerCount = demoAttempts.reduce(
    (sum, attempt) => sum + attempt.items.filter((item) => item.wrongAnswer).length,
    0,
  );

  return {
    studentId: DEMO_STUDENT_ID,
    referenceDate: toDateOnly(referenceDate),
    materialCount: demoMaterials.length,
    attemptCount: demoAttempts.length,
    itemCount,
    wrongAnswerCount,
  };
}
