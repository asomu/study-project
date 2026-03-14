import bcrypt from "bcryptjs";
import {
  Prisma,
  PracticeProblemType,
  PrismaClient,
  SchoolLevel,
  Subject,
  UserRole,
} from "@prisma/client";

const prisma = new PrismaClient();

function toNullableJson(value: readonly string[] | null) {
  return value ? [...value] : Prisma.DbNull;
}

const SEEDED_STUDENT_ID = "11111111-1111-4111-8111-111111111111";
const CURRICULUM_NODES = [
  {
    id: "22222222-2222-4222-8222-222222222222",
    unitCode: "M1-S1-U1",
    unitName: "소인수분해",
    sortOrder: 1,
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    unitCode: "M1-S1-U2",
    unitName: "정수와 유리수",
    sortOrder: 2,
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    unitCode: "M1-S1-U3",
    unitName: "문자의 사용과 식",
    sortOrder: 3,
  },
  {
    id: "55555555-5555-4555-8555-555555555555",
    unitCode: "M1-S1-U4",
    unitName: "일차방정식",
    sortOrder: 4,
  },
  {
    id: "66666666-6666-4666-8666-666666666666",
    unitCode: "M1-S1-U5",
    unitName: "좌표평면과 그래프",
    sortOrder: 5,
  },
] as const;

const CONCEPT_LESSONS = [
  {
    id: "77777777-7777-4777-8777-777777777777",
    curriculumNodeId: CURRICULUM_NODES[0].id,
    title: "소인수분해 기본 원리",
    summary: "약수를 빠르게 찾고 소인수분해 표를 정리하는 흐름을 익힙니다.",
    contentJson: {
      blocks: [
        {
          type: "headline",
          text: "1보다 큰 자연수는 소수들의 곱으로 나타낼 수 있어요.",
        },
        {
          type: "steps",
          items: [
            "가장 작은 소수부터 나누어 본다.",
            "나누어 떨어지면 같은 소수로 한 번 더 확인한다.",
            "마지막까지 나온 소수들을 곱의 형태로 정리한다.",
          ],
        },
        {
          type: "visual_hint",
          text: "나무 그림처럼 숫자를 가지치기하면 인수 관계가 눈에 잘 들어옵니다.",
        },
      ],
    },
  },
  {
    id: "88888888-8888-4888-8888-888888888888",
    curriculumNodeId: CURRICULUM_NODES[1].id,
    title: "정수와 유리수 부호 규칙",
    summary: "부호를 먼저 보고, 크기는 나중에 계산하는 습관을 만듭니다.",
    contentJson: {
      blocks: [
        {
          type: "headline",
          text: "부호 규칙을 먼저 정하면 계산 실수를 크게 줄일 수 있어요.",
        },
        {
          type: "table",
          rows: [
            ["같은 부호끼리 더하기", "부호 유지 + 절댓값 더하기"],
            ["다른 부호끼리 더하기", "절댓값 큰 수의 부호 + 절댓값 빼기"],
            ["곱셈/나눗셈", "부호가 같으면 양수, 다르면 음수"],
          ],
        },
      ],
    },
  },
  {
    id: "99999999-9999-4999-8999-999999999999",
    curriculumNodeId: CURRICULUM_NODES[3].id,
    title: "일차방정식 풀이 순서",
    summary: "항을 정리하고, 미지수를 한쪽으로 모으는 기본 흐름을 시각적으로 제공합니다.",
    contentJson: {
      blocks: [
        {
          type: "headline",
          text: "등식은 양쪽에 같은 계산을 해도 성립해요.",
        },
        {
          type: "steps",
          items: [
            "괄호가 있으면 먼저 정리한다.",
            "미지수가 있는 항을 한쪽으로 모은다.",
            "숫자항을 반대쪽으로 이항한다.",
            "마지막에 계수로 나누어 x를 구한다.",
          ],
        },
      ],
    },
  },
] as const;

const PRACTICE_SETS = [
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    title: "소인수분해 스피드 1",
    description: "자주 헷갈리는 약수 확인과 소수 분해 훈련",
    curriculumNodeId: CURRICULUM_NODES[0].id,
    sortOrder: 1,
    problems: [
      {
        id: "ab000001-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        problemNo: 1,
        type: PracticeProblemType.single_choice,
        prompt: "18의 소인수분해로 알맞은 것은?",
        choicesJson: ["2 x 3 x 3", "2 x 9", "3 x 6", "1 x 18"],
        correctAnswer: "2 x 3 x 3",
        explanation: "18은 2 x 9 = 2 x 3 x 3 입니다.",
        skillTags: ["factor_tree", "prime_factorization"],
        difficulty: 2,
      },
      {
        id: "ab000002-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        problemNo: 2,
        type: PracticeProblemType.short_answer,
        prompt: "20을 소인수분해한 결과를 적으세요.",
        choicesJson: null,
        correctAnswer: "2 x 2 x 5",
        explanation: "20 = 2 x 10 = 2 x 2 x 5 입니다.",
        skillTags: ["prime_factorization"],
        difficulty: 2,
      },
      {
        id: "ab000003-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        problemNo: 3,
        type: PracticeProblemType.single_choice,
        prompt: "다음 중 소수만 모두 고른 것은?",
        choicesJson: ["2, 3, 5", "1, 2, 3", "4, 5, 7", "2, 6, 11"],
        correctAnswer: "2, 3, 5",
        explanation: "1은 소수가 아니고, 4와 6은 합성수입니다.",
        skillTags: ["prime_number"],
        difficulty: 1,
      },
    ],
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    title: "정수 계산 워밍업",
    description: "부호 판단과 계산 순서를 빠르게 고정하는 연습",
    curriculumNodeId: CURRICULUM_NODES[1].id,
    sortOrder: 2,
    problems: [
      {
        id: "bc000001-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        problemNo: 1,
        type: PracticeProblemType.short_answer,
        prompt: "-3 + 7 = ?",
        choicesJson: null,
        correctAnswer: "4",
        explanation: "절댓값이 큰 7의 부호를 따라가면 4입니다.",
        skillTags: ["signed_addition"],
        difficulty: 1,
      },
      {
        id: "bc000002-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        problemNo: 2,
        type: PracticeProblemType.short_answer,
        prompt: "-4 x 6 = ?",
        choicesJson: null,
        correctAnswer: "-24",
        explanation: "부호가 다르므로 음수입니다.",
        skillTags: ["signed_multiplication"],
        difficulty: 1,
      },
      {
        id: "bc000003-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        problemNo: 3,
        type: PracticeProblemType.single_choice,
        prompt: "다음 중 값이 가장 큰 것은?",
        choicesJson: ["-2", "0", "3", "-5"],
        correctAnswer: "3",
        explanation: "양수가 가장 큽니다.",
        skillTags: ["compare_integers"],
        difficulty: 1,
      },
    ],
  },
  {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    title: "일차방정식 첫걸음",
    description: "한 단계 이항과 정리 연습",
    curriculumNodeId: CURRICULUM_NODES[3].id,
    sortOrder: 3,
    problems: [
      {
        id: "cd000001-cccc-4ccc-8ccc-cccccccccccc",
        problemNo: 1,
        type: PracticeProblemType.short_answer,
        prompt: "x + 5 = 9 일 때 x = ?",
        choicesJson: null,
        correctAnswer: "4",
        explanation: "양변에서 5를 빼면 x = 4 입니다.",
        skillTags: ["one_step_equation"],
        difficulty: 1,
      },
      {
        id: "cd000002-cccc-4ccc-8ccc-cccccccccccc",
        problemNo: 2,
        type: PracticeProblemType.short_answer,
        prompt: "2x = 14 일 때 x = ?",
        choicesJson: null,
        correctAnswer: "7",
        explanation: "양변을 2로 나누면 됩니다.",
        skillTags: ["equation_division"],
        difficulty: 1,
      },
      {
        id: "cd000003-cccc-4ccc-8ccc-cccccccccccc",
        problemNo: 3,
        type: PracticeProblemType.single_choice,
        prompt: "x - 3 = 8 을 풀 때 처음 해야 할 일은?",
        choicesJson: ["양변에 3 더하기", "양변에 8 더하기", "양변을 3으로 나누기", "x를 5로 바꾸기"],
        correctAnswer: "양변에 3 더하기",
        explanation: "x를 혼자 남기려면 양변에 3을 더합니다.",
        skillTags: ["equation_isolation"],
        difficulty: 2,
      },
    ],
  },
] as const;

async function main() {
  const guardianEmail = process.env.SEED_GUARDIAN_EMAIL ?? "guardian@example.com";
  const guardianPassword = process.env.SEED_GUARDIAN_PASSWORD ?? "Guardian123!";
  const passwordHash = await bcrypt.hash(guardianPassword, 12);
  const now = new Date();

  const guardian = await prisma.user.upsert({
    where: { email: guardianEmail },
    update: {
      passwordHash,
      role: UserRole.guardian,
      loginId: guardianEmail,
      name: "기본 보호자",
      isActive: true,
      acceptedTermsAt: now,
      lastLoginAt: now,
    },
    create: {
      email: guardianEmail,
      loginId: guardianEmail,
      name: "기본 보호자",
      isActive: true,
      passwordHash,
      role: UserRole.guardian,
      acceptedTermsAt: now,
      lastLoginAt: now,
    },
  });

  await prisma.userCredentialIdentifier.upsert({
    where: {
      value: guardianEmail.trim().toLowerCase(),
    },
    update: {
      userId: guardian.id,
    },
    create: {
      value: guardianEmail.trim().toLowerCase(),
      userId: guardian.id,
    },
  });

  await prisma.student.upsert({
    where: {
      id: SEEDED_STUDENT_ID,
    },
    update: {
      guardianUserId: guardian.id,
      loginUserId: null,
      name: "기본 학생",
      schoolLevel: SchoolLevel.middle,
      grade: 1,
    },
    create: {
      id: SEEDED_STUDENT_ID,
      guardianUserId: guardian.id,
      loginUserId: null,
      name: "기본 학생",
      schoolLevel: SchoolLevel.middle,
      grade: 1,
    },
  });

  const categories = [
    { key: "calculation_mistake", labelKo: "단순 연산 실수" },
    { key: "misread_question", labelKo: "문제 잘못 읽음" },
    { key: "lack_of_concept", labelKo: "문제 이해 못함" },
  ] as const;

  for (const category of categories) {
    await prisma.wrongAnswerCategory.upsert({
      where: { key: category.key },
      update: { labelKo: category.labelKo },
      create: {
        key: category.key,
        labelKo: category.labelKo,
      },
    });
  }

  for (const node of CURRICULUM_NODES) {
    await prisma.curriculumNode.upsert({
      where: { id: node.id },
      update: {
        curriculumVersion: "2026.01",
        schoolLevel: SchoolLevel.middle,
        subject: Subject.math,
        grade: 1,
        semester: 1,
        unitCode: node.unitCode,
        unitName: node.unitName,
        sortOrder: node.sortOrder,
        activeFrom: new Date("2026-01-01"),
        activeTo: null,
      },
      create: {
        id: node.id,
        curriculumVersion: "2026.01",
        schoolLevel: SchoolLevel.middle,
        subject: Subject.math,
        grade: 1,
        semester: 1,
        unitCode: node.unitCode,
        unitName: node.unitName,
        sortOrder: node.sortOrder,
        activeFrom: new Date("2026-01-01"),
        activeTo: null,
      },
    });
  }

  for (const lesson of CONCEPT_LESSONS) {
    await prisma.conceptLesson.upsert({
      where: {
        curriculumNodeId: lesson.curriculumNodeId,
      },
      update: {
        title: lesson.title,
        summary: lesson.summary,
        contentJson: lesson.contentJson,
      },
      create: {
        id: lesson.id,
        curriculumNodeId: lesson.curriculumNodeId,
        title: lesson.title,
        summary: lesson.summary,
        contentJson: lesson.contentJson,
      },
    });
  }

  for (const practiceSet of PRACTICE_SETS) {
    await prisma.practiceSet.upsert({
      where: {
        id: practiceSet.id,
      },
      update: {
        title: practiceSet.title,
        description: practiceSet.description,
        schoolLevel: SchoolLevel.middle,
        subject: Subject.math,
        grade: 1,
        semester: 1,
        curriculumNodeId: practiceSet.curriculumNodeId,
        isActive: true,
        sortOrder: practiceSet.sortOrder,
      },
      create: {
        id: practiceSet.id,
        title: practiceSet.title,
        description: practiceSet.description,
        schoolLevel: SchoolLevel.middle,
        subject: Subject.math,
        grade: 1,
        semester: 1,
        curriculumNodeId: practiceSet.curriculumNodeId,
        isActive: true,
        sortOrder: practiceSet.sortOrder,
      },
    });

    for (const problem of practiceSet.problems) {
      await prisma.practiceProblem.upsert({
        where: {
          id: problem.id,
        },
        update: {
          practiceSetId: practiceSet.id,
          curriculumNodeId: practiceSet.curriculumNodeId,
          problemNo: problem.problemNo,
          type: problem.type,
          prompt: problem.prompt,
          choicesJson: toNullableJson(problem.choicesJson),
          correctAnswer: problem.correctAnswer,
          explanation: problem.explanation,
          skillTags: [...problem.skillTags],
          difficulty: problem.difficulty,
        },
        create: {
          id: problem.id,
          practiceSetId: practiceSet.id,
          curriculumNodeId: practiceSet.curriculumNodeId,
          problemNo: problem.problemNo,
          type: problem.type,
          prompt: problem.prompt,
          choicesJson: toNullableJson(problem.choicesJson),
          correctAnswer: problem.correctAnswer,
          explanation: problem.explanation,
          skillTags: [...problem.skillTags],
          difficulty: problem.difficulty,
        },
      });
    }
  }
}

main()
  .catch(async (error) => {
    console.error("Seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
