import { createHash } from "node:crypto";
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
type CurriculumNodeSeed = {
  id: string;
  curriculumVersion: string;
  schoolLevel?: SchoolLevel;
  grade: number;
  semester: number;
  unitCode: string;
  unitName: string;
  sortOrder: number;
  activeFrom: Date;
  activeTo: Date | null;
};

function createDeterministicUuid(seed: string) {
  const normalized = createHash("sha1").update(seed).digest("hex").slice(0, 32).split("");
  normalized[12] = "4";
  normalized[16] = "8";
  const hex = normalized.join("");

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

const CURRENT_CURRICULUM_NODE_IDS = {
  grade1Semester1PrimeFactorization: "22222222-2222-4222-8222-222222222222",
  grade1Semester1IntegersAndRationals: "33333333-3333-4333-8333-333333333333",
  grade1Semester1Expressions: "44444444-4444-4444-8444-444444444444",
  grade1Semester1LinearEquations: "55555555-5555-4555-8555-555555555555",
  grade1Semester1CoordinatePlane: "66666666-6666-4666-8666-666666666666",
  grade1Semester2BasicFigures: "12121212-1212-4212-8212-121212121212",
  grade1Semester2SolidFigures: "13131313-1313-4313-8313-131313131313",
  grade2Semester1RepeatingDecimals: "14141414-1414-4414-8414-141414141414",
  grade2Semester1ExpressionCalculation: "15151515-1515-4515-8515-151515151515",
  grade2Semester1LinearFunctions: "16161616-1616-4616-8616-161616161616",
  grade2Semester2Probability: "17171717-1717-4717-8717-171717171717",
  grade3Semester1RealNumbers: "18181818-1818-4818-8818-181818181818",
  grade3Semester1Factoring: "19191919-1919-4919-8919-191919191919",
  grade3Semester2TrigonometricRatio: "20202020-2020-4020-8020-202020202020",
  grade3Semester2CircleProperties: "21212121-2121-4121-8121-212121212121",
} as const;

const ELEMENTARY_CURRICULUM_BUNDLES = [
  {
    grade: 1,
    semester: 1,
    activeFrom: "2024-03-01",
    units: ["9까지의 수", "여러 가지 모양", "덧셈과 뺄셈", "비교하기", "50까지의 수"],
  },
  {
    grade: 1,
    semester: 2,
    activeFrom: "2024-03-01",
    units: ["100까지의 수", "덧셈과 뺄셈", "여러 가지 모양과 규칙 찾기", "시각과 시간", "자료의 정리"],
  },
  {
    grade: 2,
    semester: 1,
    activeFrom: "2024-03-01",
    units: ["세 자리 수", "덧셈과 뺄셈", "여러 가지 도형", "길이 재기", "분류와 표"],
  },
  {
    grade: 2,
    semester: 2,
    activeFrom: "2024-03-01",
    units: ["네 자리 수", "곱셈구구와 곱셈", "시각과 시간", "길이와 단위", "규칙 찾기와 그래프"],
  },
  {
    grade: 3,
    semester: 1,
    activeFrom: "2025-03-01",
    units: ["큰 수", "곱셈", "나눗셈", "평면도형", "길이와 시간"],
  },
  {
    grade: 3,
    semester: 2,
    activeFrom: "2025-03-01",
    units: ["분수와 소수", "여러 가지 삼각형", "들이와 무게", "자료를 정리하고 나타내기", "규칙을 수나 식으로 나타내기"],
  },
  {
    grade: 4,
    semester: 1,
    activeFrom: "2025-03-01",
    units: ["큰 수와 어림셈", "각도", "곱셈과 나눗셈", "평면도형의 이동", "막대그래프"],
  },
  {
    grade: 4,
    semester: 2,
    activeFrom: "2025-03-01",
    units: ["분수의 덧셈과 뺄셈", "소수의 덧셈과 뺄셈", "여러 가지 삼각형", "여러 가지 사각형", "꺾은선그래프"],
  },
  {
    grade: 5,
    semester: 1,
    activeFrom: "2026-03-01",
    units: ["자연수의 혼합 계산", "약수와 배수", "대응 관계", "약분과 통분", "분모가 다른 분수의 덧셈과 뺄셈", "다각형의 둘레와 넓이"],
  },
  {
    grade: 5,
    semester: 2,
    activeFrom: "2026-03-01",
    units: ["수의 범위와 어림하기", "분수의 곱셈", "소수의 곱셈", "합동과 대칭", "직육면체와 정육면체", "평균"],
  },
  {
    grade: 6,
    semester: 1,
    activeFrom: "2026-03-01",
    units: ["분수의 나눗셈", "소수의 나눗셈", "비와 비율", "각기둥과 각뿔", "띠그래프와 원그래프"],
  },
  {
    grade: 6,
    semester: 2,
    activeFrom: "2026-03-01",
    units: ["비례식과 비례배분", "원기둥, 원뿔, 구", "원주율과 원의 넓이", "입체도형의 겉넓이와 부피", "가능성"],
  },
] as const;

const ELEMENTARY_CURRICULUM_NODES: CurriculumNodeSeed[] = ELEMENTARY_CURRICULUM_BUNDLES.flatMap((bundle) =>
  bundle.units.map((unitName, index) => ({
    id: createDeterministicUuid(`elementary:${bundle.grade}:${bundle.semester}:${index + 1}:${unitName}`),
    curriculumVersion: "2022.12",
    schoolLevel: SchoolLevel.elementary,
    grade: bundle.grade,
    semester: bundle.semester,
    unitCode: `E${bundle.grade}-S${bundle.semester}-U${index + 1}`,
    unitName,
    sortOrder: index + 1,
    activeFrom: new Date(`${bundle.activeFrom}T00:00:00.000Z`),
    activeTo: null,
  })),
);

const SEEDED_WORKBOOK_TEMPLATES = [
  {
    id: "61616161-6161-4616-8616-616161616161",
    title: "개념원리 베이직 1-1",
    publisher: "개념원리",
    grade: 1,
    semester: 1,
    studentWorkbookId: "71717171-7171-4717-8717-717171717171",
    stages: [
      { id: "81818181-8181-4818-8818-818181818181", name: "개념원리 이해", sortOrder: 0 },
      { id: "82828282-8282-4828-8828-828282828282", name: "핵심문제 익히기", sortOrder: 1 },
      { id: "83838383-8383-4838-8838-838383838383", name: "중단원 마무리하기", sortOrder: 2 },
      { id: "84848484-8484-4848-8848-848484848484", name: "서술형 대비문제", sortOrder: 3 },
    ],
  },
  {
    id: "91919191-9191-4919-8919-919191919191",
    title: "개념원리 베이직 2-1",
    publisher: "개념원리",
    grade: 2,
    semester: 1,
    studentWorkbookId: "92929292-9292-4929-8929-929292929292",
    stages: [
      { id: "93939393-9393-4939-8939-939393939393", name: "개념원리 이해", sortOrder: 0 },
      { id: "94949494-9494-4949-8949-949494949494", name: "핵심문제 익히기", sortOrder: 1 },
      { id: "95959595-9595-4959-8959-959595959595", name: "중단원 마무리하기", sortOrder: 2 },
      { id: "96969696-9696-4969-8969-969696969696", name: "서술형 대비문제", sortOrder: 3 },
    ],
  },
] as const;

const CURRICULUM_NODES: readonly CurriculumNodeSeed[] = [
  {
    id: CURRENT_CURRICULUM_NODE_IDS.grade1Semester1PrimeFactorization,
    curriculumVersion: "2022.12",
    grade: 1,
    semester: 1,
    unitCode: "M1-S1-U1",
    unitName: "소인수분해",
    sortOrder: 1,
    activeFrom: new Date("2025-03-01T00:00:00.000Z"),
    activeTo: null,
  },
  {
    id: CURRENT_CURRICULUM_NODE_IDS.grade1Semester1IntegersAndRationals,
    curriculumVersion: "2022.12",
    grade: 1,
    semester: 1,
    unitCode: "M1-S1-U2",
    unitName: "정수와 유리수",
    sortOrder: 2,
    activeFrom: new Date("2025-03-01T00:00:00.000Z"),
    activeTo: null,
  },
  {
    id: "34343434-3434-4343-8343-343434343434",
    curriculumVersion: "2022.12",
    grade: 1,
    semester: 1,
    unitCode: "M1-S1-U3",
    unitName: "정수와 유리수의 계산",
    sortOrder: 3,
    activeFrom: new Date("2025-03-01T00:00:00.000Z"),
    activeTo: null,
  },
  {
    id: CURRENT_CURRICULUM_NODE_IDS.grade1Semester1Expressions,
    curriculumVersion: "2022.12",
    grade: 1,
    semester: 1,
    unitCode: "M1-S1-U4",
    unitName: "문자의 사용과 식",
    sortOrder: 4,
    activeFrom: new Date("2025-03-01T00:00:00.000Z"),
    activeTo: null,
  },
  {
    id: CURRENT_CURRICULUM_NODE_IDS.grade1Semester1LinearEquations,
    curriculumVersion: "2022.12",
    grade: 1,
    semester: 1,
    unitCode: "M1-S1-U5",
    unitName: "일차방정식",
    sortOrder: 5,
    activeFrom: new Date("2025-03-01T00:00:00.000Z"),
    activeTo: null,
  },
  {
    id: CURRENT_CURRICULUM_NODE_IDS.grade1Semester1CoordinatePlane,
    curriculumVersion: "2022.12",
    grade: 1,
    semester: 1,
    unitCode: "M1-S1-U6",
    unitName: "좌표평면과 그래프",
    sortOrder: 6,
    activeFrom: new Date("2025-03-01T00:00:00.000Z"),
    activeTo: null,
  },
  {
    id: "67676767-6767-4767-8767-676767676767",
    curriculumVersion: "2022.12",
    grade: 1,
    semester: 1,
    unitCode: "M1-S1-U7",
    unitName: "정비례와 반비례",
    sortOrder: 7,
    activeFrom: new Date("2025-03-01T00:00:00.000Z"),
    activeTo: null,
  },
  {
    id: CURRENT_CURRICULUM_NODE_IDS.grade1Semester2BasicFigures,
    curriculumVersion: "2022.12",
    grade: 1,
    semester: 2,
    unitCode: "M1-S2-U1",
    unitName: "기본 도형",
    sortOrder: 1,
    activeFrom: new Date("2025-03-01T00:00:00.000Z"),
    activeTo: null,
  },
  {
    id: "23232323-2323-4232-8232-232323232323",
    curriculumVersion: "2022.12",
    grade: 1,
    semester: 2,
    unitCode: "M1-S2-U2",
    unitName: "작도와 합동",
    sortOrder: 2,
    activeFrom: new Date("2025-03-01T00:00:00.000Z"),
    activeTo: null,
  },
  {
    id: "24242424-2424-4242-8242-242424242424",
    curriculumVersion: "2022.12",
    grade: 1,
    semester: 2,
    unitCode: "M1-S2-U3",
    unitName: "다각형",
    sortOrder: 3,
    activeFrom: new Date("2025-03-01T00:00:00.000Z"),
    activeTo: null,
  },
  {
    id: "25252525-2525-4252-8252-252525252525",
    curriculumVersion: "2022.12",
    grade: 1,
    semester: 2,
    unitCode: "M1-S2-U4",
    unitName: "원과 부채꼴",
    sortOrder: 4,
    activeFrom: new Date("2025-03-01T00:00:00.000Z"),
    activeTo: null,
  },
  {
    id: CURRENT_CURRICULUM_NODE_IDS.grade1Semester2SolidFigures,
    curriculumVersion: "2022.12",
    grade: 1,
    semester: 2,
    unitCode: "M1-S2-U5",
    unitName: "입체도형",
    sortOrder: 5,
    activeFrom: new Date("2025-03-01T00:00:00.000Z"),
    activeTo: null,
  },
  {
    id: "26262626-2626-4262-8262-262626262626",
    curriculumVersion: "2022.12",
    grade: 1,
    semester: 2,
    unitCode: "M1-S2-U6",
    unitName: "자료의 정리와 해석",
    sortOrder: 6,
    activeFrom: new Date("2025-03-01T00:00:00.000Z"),
    activeTo: null,
  },
  {
    id: CURRENT_CURRICULUM_NODE_IDS.grade2Semester1RepeatingDecimals,
    curriculumVersion: "2022.12",
    grade: 2,
    semester: 1,
    unitCode: "M2-S1-U1",
    unitName: "유리수와 순환소수",
    sortOrder: 1,
    activeFrom: new Date("2026-03-01T00:00:00.000Z"),
    activeTo: null,
  },
  {
    id: CURRENT_CURRICULUM_NODE_IDS.grade2Semester1ExpressionCalculation,
    curriculumVersion: "2022.12",
    grade: 2,
    semester: 1,
    unitCode: "M2-S1-U2",
    unitName: "식의 계산",
    sortOrder: 2,
    activeFrom: new Date("2026-03-01T00:00:00.000Z"),
    activeTo: null,
  },
  {
    id: "27272727-2727-4272-8272-272727272727",
    curriculumVersion: "2022.12",
    grade: 2,
    semester: 1,
    unitCode: "M2-S1-U3",
    unitName: "연립일차방정식",
    sortOrder: 3,
    activeFrom: new Date("2026-03-01T00:00:00.000Z"),
    activeTo: null,
  },
  {
    id: "28282828-2828-4282-8282-282828282828",
    curriculumVersion: "2022.12",
    grade: 2,
    semester: 1,
    unitCode: "M2-S1-U4",
    unitName: "일차부등식",
    sortOrder: 4,
    activeFrom: new Date("2026-03-01T00:00:00.000Z"),
    activeTo: null,
  },
  {
    id: CURRENT_CURRICULUM_NODE_IDS.grade2Semester1LinearFunctions,
    curriculumVersion: "2022.12",
    grade: 2,
    semester: 1,
    unitCode: "M2-S1-U5",
    unitName: "일차함수",
    sortOrder: 5,
    activeFrom: new Date("2026-03-01T00:00:00.000Z"),
    activeTo: null,
  },
  {
    id: "29292929-2929-4292-8292-292929292929",
    curriculumVersion: "2022.12",
    grade: 2,
    semester: 1,
    unitCode: "M2-S1-U6",
    unitName: "일차함수와 일차방정식의 관계",
    sortOrder: 6,
    activeFrom: new Date("2026-03-01T00:00:00.000Z"),
    activeTo: null,
  },
  {
    id: "30303030-3030-4030-8030-303030303030",
    curriculumVersion: "2022.12",
    grade: 2,
    semester: 2,
    unitCode: "M2-S2-U1",
    unitName: "삼각형의 성질",
    sortOrder: 1,
    activeFrom: new Date("2026-03-01T00:00:00.000Z"),
    activeTo: null,
  },
  {
    id: "31313131-3131-4131-8131-313131313131",
    curriculumVersion: "2022.12",
    grade: 2,
    semester: 2,
    unitCode: "M2-S2-U2",
    unitName: "사각형의 성질",
    sortOrder: 2,
    activeFrom: new Date("2026-03-01T00:00:00.000Z"),
    activeTo: null,
  },
  {
    id: "32323232-3232-4232-8232-323232323232",
    curriculumVersion: "2022.12",
    grade: 2,
    semester: 2,
    unitCode: "M2-S2-U3",
    unitName: "도형의 닮음",
    sortOrder: 3,
    activeFrom: new Date("2026-03-01T00:00:00.000Z"),
    activeTo: null,
  },
  {
    id: "45454545-4545-4454-8454-454545454545",
    curriculumVersion: "2022.12",
    grade: 2,
    semester: 2,
    unitCode: "M2-S2-U4",
    unitName: "피타고라스 정리",
    sortOrder: 4,
    activeFrom: new Date("2026-03-01T00:00:00.000Z"),
    activeTo: null,
  },
  {
    id: CURRENT_CURRICULUM_NODE_IDS.grade2Semester2Probability,
    curriculumVersion: "2022.12",
    grade: 2,
    semester: 2,
    unitCode: "M2-S2-U5",
    unitName: "경우의 수와 확률",
    sortOrder: 5,
    activeFrom: new Date("2026-03-01T00:00:00.000Z"),
    activeTo: null,
  },
  {
    id: CURRENT_CURRICULUM_NODE_IDS.grade3Semester1RealNumbers,
    curriculumVersion: "2015.09",
    grade: 3,
    semester: 1,
    unitCode: "M3-S1-U1",
    unitName: "제곱근과 실수",
    sortOrder: 1,
    activeFrom: new Date("2018-03-01T00:00:00.000Z"),
    activeTo: null,
  },
  {
    id: CURRENT_CURRICULUM_NODE_IDS.grade3Semester1Factoring,
    curriculumVersion: "2015.09",
    grade: 3,
    semester: 1,
    unitCode: "M3-S1-U2",
    unitName: "다항식의 곱셈과 인수분해",
    sortOrder: 2,
    activeFrom: new Date("2018-03-01T00:00:00.000Z"),
    activeTo: null,
  },
  {
    id: "46464646-4646-4464-8464-464646464646",
    curriculumVersion: "2015.09",
    grade: 3,
    semester: 1,
    unitCode: "M3-S1-U3",
    unitName: "이차방정식",
    sortOrder: 3,
    activeFrom: new Date("2018-03-01T00:00:00.000Z"),
    activeTo: null,
  },
  {
    id: "47474747-4747-4474-8474-474747474747",
    curriculumVersion: "2015.09",
    grade: 3,
    semester: 1,
    unitCode: "M3-S1-U4",
    unitName: "이차함수",
    sortOrder: 4,
    activeFrom: new Date("2018-03-01T00:00:00.000Z"),
    activeTo: null,
  },
  {
    id: CURRENT_CURRICULUM_NODE_IDS.grade3Semester2TrigonometricRatio,
    curriculumVersion: "2015.09",
    grade: 3,
    semester: 2,
    unitCode: "M3-S2-U1",
    unitName: "삼각비",
    sortOrder: 1,
    activeFrom: new Date("2018-03-01T00:00:00.000Z"),
    activeTo: null,
  },
  {
    id: CURRENT_CURRICULUM_NODE_IDS.grade3Semester2CircleProperties,
    curriculumVersion: "2015.09",
    grade: 3,
    semester: 2,
    unitCode: "M3-S2-U2",
    unitName: "원의 성질",
    sortOrder: 2,
    activeFrom: new Date("2018-03-01T00:00:00.000Z"),
    activeTo: null,
  },
  {
    id: "48484848-4848-4484-8484-484848484848",
    curriculumVersion: "2015.09",
    grade: 3,
    semester: 2,
    unitCode: "M3-S2-U3",
    unitName: "통계",
    sortOrder: 3,
    activeFrom: new Date("2018-03-01T00:00:00.000Z"),
    activeTo: null,
  },
  ...ELEMENTARY_CURRICULUM_NODES,
] as const;

const CONCEPT_LESSONS = [
  {
    id: "77777777-7777-4777-8777-777777777777",
    curriculumNodeId: CURRENT_CURRICULUM_NODE_IDS.grade1Semester1PrimeFactorization,
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
    curriculumNodeId: CURRENT_CURRICULUM_NODE_IDS.grade1Semester1IntegersAndRationals,
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
    curriculumNodeId: CURRENT_CURRICULUM_NODE_IDS.grade1Semester1LinearEquations,
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
    curriculumNodeId: CURRENT_CURRICULUM_NODE_IDS.grade1Semester1PrimeFactorization,
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
    curriculumNodeId: CURRENT_CURRICULUM_NODE_IDS.grade1Semester1IntegersAndRationals,
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
    curriculumNodeId: CURRENT_CURRICULUM_NODE_IDS.grade1Semester1LinearEquations,
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

  for (const workbookTemplate of SEEDED_WORKBOOK_TEMPLATES) {
    await prisma.workbookTemplate.upsert({
      where: {
        id: workbookTemplate.id,
      },
      update: {
        guardianUserId: guardian.id,
        title: workbookTemplate.title,
        publisher: workbookTemplate.publisher,
        schoolLevel: SchoolLevel.middle,
        grade: workbookTemplate.grade,
        semester: workbookTemplate.semester,
        isActive: true,
      },
      create: {
        id: workbookTemplate.id,
        guardianUserId: guardian.id,
        title: workbookTemplate.title,
        publisher: workbookTemplate.publisher,
        schoolLevel: SchoolLevel.middle,
        grade: workbookTemplate.grade,
        semester: workbookTemplate.semester,
        isActive: true,
      },
    });

    for (const stage of workbookTemplate.stages) {
      await prisma.workbookTemplateStage.upsert({
        where: {
          id: stage.id,
        },
        update: {
          workbookTemplateId: workbookTemplate.id,
          name: stage.name,
          sortOrder: stage.sortOrder,
        },
        create: {
          id: stage.id,
          workbookTemplateId: workbookTemplate.id,
          name: stage.name,
          sortOrder: stage.sortOrder,
        },
      });
    }

    await prisma.studentWorkbook.upsert({
      where: {
        id: workbookTemplate.studentWorkbookId,
      },
      update: {
        studentId: SEEDED_STUDENT_ID,
        workbookTemplateId: workbookTemplate.id,
        isArchived: false,
      },
      create: {
        id: workbookTemplate.studentWorkbookId,
        studentId: SEEDED_STUDENT_ID,
        workbookTemplateId: workbookTemplate.id,
        isArchived: false,
      },
    });
  }

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
    const schoolLevel = node.schoolLevel ?? SchoolLevel.middle;

    await prisma.curriculumNode.upsert({
      where: { id: node.id },
      update: {
        curriculumVersion: node.curriculumVersion,
        schoolLevel,
        subject: Subject.math,
        grade: node.grade,
        semester: node.semester,
        unitCode: node.unitCode,
        unitName: node.unitName,
        sortOrder: node.sortOrder,
        activeFrom: node.activeFrom,
        activeTo: node.activeTo,
      },
      create: {
        id: node.id,
        curriculumVersion: node.curriculumVersion,
        schoolLevel,
        subject: Subject.math,
        grade: node.grade,
        semester: node.semester,
        unitCode: node.unitCode,
        unitName: node.unitName,
        sortOrder: node.sortOrder,
        activeFrom: node.activeFrom,
        activeTo: node.activeTo,
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
