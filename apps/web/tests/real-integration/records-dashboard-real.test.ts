import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { POST as POST_ATTEMPT_ITEMS } from "@/app/api/v1/attempts/[attemptId]/items/route";
import { POST as POST_ATTEMPTS } from "@/app/api/v1/attempts/route";
import { POST as POST_MATERIALS } from "@/app/api/v1/materials/route";
import { PUT as PUT_WRONG_ANSWER_CATEGORIES } from "@/app/api/v1/wrong-answers/[id]/categories/route";
import { POST as POST_WRONG_ANSWER_IMAGE } from "@/app/api/v1/wrong-answers/[id]/image/route";
import { GET as GET_WRONG_ANSWERS, POST as POST_WRONG_ANSWERS } from "@/app/api/v1/wrong-answers/route";
import { GET as GET_OVERVIEW } from "@/app/api/v1/dashboard/overview/route";
import { GET as GET_TRENDS } from "@/app/api/v1/dashboard/trends/route";
import { GET as GET_WEAKNESS } from "@/app/api/v1/dashboard/weakness/route";
import {
  clearTestUploadDirectory,
  createSeedGuardianAuthCookie,
  getSeedGuardian,
  resetSeedStudentScopedData,
  SEEDED_CURRICULUM_NODE_ID,
  SEEDED_STUDENT_ID,
} from "./db-test-helpers";

function createJsonRequest(url: string, authCookie: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: {
      cookie: authCookie,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function buildDateOnly(daysFromToday = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

describe("real integration: records to dashboard", () => {
  beforeAll(async () => {
    await getSeedGuardian();
  });

  beforeEach(async () => {
    await resetSeedStudentScopedData();
    await clearTestUploadDirectory();
  });

  afterAll(async () => {
    await resetSeedStudentScopedData();
    await clearTestUploadDirectory();
    await prisma.$disconnect();
  });

  it("persists records through real prisma and reflects them in wrong-answer and dashboard queries", async () => {
    const authCookie = await createSeedGuardianAuthCookie();
    const attemptDate = buildDateOnly();

    const materialResponse = await POST_MATERIALS(
      createJsonRequest("http://localhost/api/v1/materials", authCookie, {
        studentId: SEEDED_STUDENT_ID,
        title: "실DB 검증 문제집",
        publisher: "테스트 출판사",
        subject: "math",
        grade: 1,
        semester: 1,
      }),
    );
    const materialBody = (await materialResponse.json()) as { id: string };

    expect(materialResponse.status).toBe(201);

    const attemptResponse = await POST_ATTEMPTS(
      createJsonRequest("http://localhost/api/v1/attempts", authCookie, {
        studentId: SEEDED_STUDENT_ID,
        materialId: materialBody.id,
        attemptDate,
        notes: "실DB 회귀",
      }),
    );
    const attemptBody = (await attemptResponse.json()) as { id: string };

    expect(attemptResponse.status).toBe(201);

    const attemptItemsResponse = await POST_ATTEMPT_ITEMS(
      createJsonRequest(`http://localhost/api/v1/attempts/${attemptBody.id}/items`, authCookie, {
        items: [
          {
            curriculumNodeId: SEEDED_CURRICULUM_NODE_ID,
            problemNo: 1,
            isCorrect: false,
            difficulty: 2,
          },
          {
            curriculumNodeId: SEEDED_CURRICULUM_NODE_ID,
            problemNo: 2,
            isCorrect: false,
            difficulty: 2,
          },
          {
            curriculumNodeId: SEEDED_CURRICULUM_NODE_ID,
            problemNo: 3,
            isCorrect: true,
            difficulty: 3,
          },
        ],
      }),
      { params: Promise.resolve({ attemptId: attemptBody.id }) },
    );
    const attemptItemsBody = (await attemptItemsResponse.json()) as {
      items: Array<{ id: string }>;
    };

    expect(attemptItemsResponse.status).toBe(201);
    expect(attemptItemsBody.items).toHaveLength(3);

    const firstWrongAnswerResponse = await POST_WRONG_ANSWERS(
      createJsonRequest("http://localhost/api/v1/wrong-answers", authCookie, {
        attemptItemId: attemptItemsBody.items[0]?.id,
        memo: "첫 번째 오답",
      }),
    );
    const firstWrongAnswerBody = (await firstWrongAnswerResponse.json()) as { id: string };

    expect(firstWrongAnswerResponse.status).toBe(201);

    const secondWrongAnswerResponse = await POST_WRONG_ANSWERS(
      createJsonRequest("http://localhost/api/v1/wrong-answers", authCookie, {
        attemptItemId: attemptItemsBody.items[1]?.id,
        memo: "두 번째 오답",
      }),
    );

    expect(secondWrongAnswerResponse.status).toBe(201);

    const categoriesResponse = await PUT_WRONG_ANSWER_CATEGORIES(
      createJsonRequest(`http://localhost/api/v1/wrong-answers/${firstWrongAnswerBody.id}/categories`, authCookie, {
        categoryKeys: ["misread_question"],
      }),
      { params: Promise.resolve({ id: firstWrongAnswerBody.id }) },
    );

    expect(categoriesResponse.status).toBe(200);

    const wrongAnswersResponse = await GET_WRONG_ANSWERS(
      new Request(
        `http://localhost/api/v1/wrong-answers?studentId=${SEEDED_STUDENT_ID}&to=${attemptDate}`,
        {
          method: "GET",
          headers: {
            cookie: authCookie,
          },
        },
      ),
    );
    const wrongAnswersBody = (await wrongAnswersResponse.json()) as {
      wrongAnswers: Array<{ categories: Array<{ key: string }> }>;
    };

    expect(wrongAnswersResponse.status).toBe(200);
    expect(wrongAnswersBody.wrongAnswers).toHaveLength(2);
    expect(wrongAnswersBody.wrongAnswers[0]?.categories[0]?.key ?? wrongAnswersBody.wrongAnswers[1]?.categories[0]?.key).toBe(
      "misread_question",
    );

    const overviewResponse = await GET_OVERVIEW(
      new Request(`http://localhost/api/v1/dashboard/overview?studentId=${SEEDED_STUDENT_ID}&date=${attemptDate}`, {
        method: "GET",
        headers: {
          cookie: authCookie,
        },
      }),
    );
    const overviewBody = (await overviewResponse.json()) as {
      progress: { actualPct: number; coveredUnits: number; totalUnits: number };
      mastery: { overallScorePct: number; recentAccuracyPct: number; difficultyWeightedAccuracyPct: number };
      summary: { totalAttempts: number; totalItems: number; wrongAnswers: number };
    };
    const expectedActualPct = Math.round((100 / overviewBody.progress.totalUnits) * 10) / 10;

    expect(overviewResponse.status).toBe(200);
    expect(overviewBody.progress.coveredUnits).toBe(1);
    expect(overviewBody.progress.totalUnits).toBeGreaterThanOrEqual(1);
    expect(overviewBody.progress.actualPct).toBe(expectedActualPct);
    expect(overviewBody.mastery.recentAccuracyPct).toBe(33.3);
    expect(overviewBody.mastery.difficultyWeightedAccuracyPct).toBe(42.9);
    expect(overviewBody.mastery.overallScorePct).toBe(34.7);
    expect(overviewBody.summary.totalAttempts).toBe(1);
    expect(overviewBody.summary.totalItems).toBe(3);
    expect(overviewBody.summary.wrongAnswers).toBe(2);

    const weaknessResponse = await GET_WEAKNESS(
      new Request(`http://localhost/api/v1/dashboard/weakness?studentId=${SEEDED_STUDENT_ID}&period=weekly`, {
        method: "GET",
        headers: {
          cookie: authCookie,
        },
      }),
    );
    const weaknessBody = (await weaknessResponse.json()) as {
      weakUnits: Array<{ unitName: string; attempts: number; accuracyPct: number; wrongCount: number }>;
      categoryDistribution: Array<{ key: string; count: number; ratio: number }>;
    };

    expect(weaknessResponse.status).toBe(200);
    expect(weaknessBody.weakUnits).toEqual([
      {
        curriculumNodeId: SEEDED_CURRICULUM_NODE_ID,
        unitName: "소인수분해",
        attempts: 3,
        accuracyPct: 33.3,
        wrongCount: 2,
      },
    ]);
    expect(weaknessBody.categoryDistribution).toEqual([
      {
        key: "misread_question",
        labelKo: "문제 잘못 읽음",
        count: 1,
        ratio: 100,
      },
    ]);

    const rangeStart = buildDateOnly(-27);
    const trendsResponse = await GET_TRENDS(
      new Request(
        `http://localhost/api/v1/dashboard/trends?studentId=${SEEDED_STUDENT_ID}&rangeStart=${rangeStart}&rangeEnd=${attemptDate}`,
        {
          method: "GET",
          headers: {
            cookie: authCookie,
          },
        },
      ),
    );
    const trendsBody = (await trendsResponse.json()) as {
      points: Array<{ totalItems: number; correctItems: number }>;
    };

    expect(trendsResponse.status).toBe(200);
    expect(trendsBody.points.some((point) => point.totalItems === 3 && point.correctItems === 1)).toBe(true);
  });

  it("enforces the database unique constraint during concurrent duplicate problemNo writes", async () => {
    const authCookie = await createSeedGuardianAuthCookie();
    const attemptDate = buildDateOnly();

    const materialResponse = await POST_MATERIALS(
      createJsonRequest("http://localhost/api/v1/materials", authCookie, {
        studentId: SEEDED_STUDENT_ID,
        title: "중복 검증 문제집",
        publisher: "테스트 출판사",
        subject: "math",
        grade: 1,
        semester: 1,
      }),
    );
    const materialBody = (await materialResponse.json()) as { id: string };

    const attemptResponse = await POST_ATTEMPTS(
      createJsonRequest("http://localhost/api/v1/attempts", authCookie, {
        studentId: SEEDED_STUDENT_ID,
        materialId: materialBody.id,
        attemptDate,
        notes: "중복 검증",
      }),
    );
    const attemptBody = (await attemptResponse.json()) as { id: string };

    const results = await Promise.allSettled([
      prisma.attemptItem.create({
        data: {
          attemptId: attemptBody.id,
          curriculumNodeId: SEEDED_CURRICULUM_NODE_ID,
          problemNo: 7,
          isCorrect: false,
          difficulty: 2,
        },
      }),
      prisma.attemptItem.create({
        data: {
          attemptId: attemptBody.id,
          curriculumNodeId: SEEDED_CURRICULUM_NODE_ID,
          problemNo: 7,
          isCorrect: false,
          difficulty: 2,
        },
      }),
    ]);
    const statuses = results.map((result) => result.status).sort();
    const storedCount = await prisma.attemptItem.count({
      where: {
        attemptId: attemptBody.id,
      },
    });

    expect(statuses).toEqual(["fulfilled", "rejected"]);
    expect(storedCount).toBe(1);
  });

  it("rejects mismatched image signatures even when the declared mime type is allowed", async () => {
    const authCookie = await createSeedGuardianAuthCookie();
    const attemptDate = buildDateOnly();

    const materialResponse = await POST_MATERIALS(
      createJsonRequest("http://localhost/api/v1/materials", authCookie, {
        studentId: SEEDED_STUDENT_ID,
        title: "이미지 검증 문제집",
        publisher: "테스트 출판사",
        subject: "math",
        grade: 1,
        semester: 1,
      }),
    );
    const materialBody = (await materialResponse.json()) as { id: string };

    const attemptResponse = await POST_ATTEMPTS(
      createJsonRequest("http://localhost/api/v1/attempts", authCookie, {
        studentId: SEEDED_STUDENT_ID,
        materialId: materialBody.id,
        attemptDate,
        notes: "이미지 서명 검증",
      }),
    );
    const attemptBody = (await attemptResponse.json()) as { id: string };

    const attemptItemsResponse = await POST_ATTEMPT_ITEMS(
      createJsonRequest(`http://localhost/api/v1/attempts/${attemptBody.id}/items`, authCookie, {
        items: [
          {
            curriculumNodeId: SEEDED_CURRICULUM_NODE_ID,
            problemNo: 1,
            isCorrect: false,
            difficulty: 2,
          },
        ],
      }),
      { params: Promise.resolve({ attemptId: attemptBody.id }) },
    );
    const attemptItemsBody = (await attemptItemsResponse.json()) as {
      items: Array<{ id: string }>;
    };

    const wrongAnswerResponse = await POST_WRONG_ANSWERS(
      createJsonRequest("http://localhost/api/v1/wrong-answers", authCookie, {
        attemptItemId: attemptItemsBody.items[0]?.id,
        memo: "이미지 테스트",
      }),
    );
    const wrongAnswerBody = (await wrongAnswerResponse.json()) as { id: string };

    const formData = new FormData();
    formData.set("file", new File([Buffer.from("not-a-real-png")], "fake.png", { type: "image/png" }));

    const uploadResponse = await POST_WRONG_ANSWER_IMAGE(
      new Request(`http://localhost/api/v1/wrong-answers/${wrongAnswerBody.id}/image`, {
        method: "POST",
        headers: {
          cookie: authCookie,
        },
        body: formData,
      }),
      { params: Promise.resolve({ id: wrongAnswerBody.id }) },
    );
    const uploadBody = (await uploadResponse.json()) as { error: { code: string } };
    const updatedWrongAnswer = await prisma.wrongAnswer.findUnique({
      where: {
        id: wrongAnswerBody.id,
      },
    });

    expect(uploadResponse.status).toBe(415);
    expect(uploadBody.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
    expect(updatedWrongAnswer?.imagePath ?? null).toBeNull();
  });
});
