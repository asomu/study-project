import { SchoolLevel, Subject } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GET as GET_OVERVIEW } from "@/app/api/v1/dashboard/overview/route";
import { GET as GET_TRENDS } from "@/app/api/v1/dashboard/trends/route";
import { GET as GET_WEAKNESS } from "@/app/api/v1/dashboard/weakness/route";
import { GET as GET_WRONG_ANSWERS } from "@/app/api/v1/wrong-answers/route";
import { prisma } from "@/lib/prisma";
import { clearDemoData, DEMO_STUDENT_ID, seedDemoData } from "@/modules/demo/demo-data";
import { addDaysUtc } from "@/modules/dashboard/date-range";
import { createSeedGuardianAuthCookie, getSeedGuardian } from "./db-test-helpers";

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

describe("real integration: demo seed", () => {
  beforeAll(async () => {
    await getSeedGuardian();
  });

  beforeEach(async () => {
    await clearDemoData();
  });

  afterAll(async () => {
    await clearDemoData();
    await prisma.$disconnect();
  });

  it("is idempotent and fills dashboard and wrong-answer demo views", async () => {
    const referenceDate = new Date();
    const authCookie = await createSeedGuardianAuthCookie();

    const firstSeed = await seedDemoData({ referenceDate });
    const secondSeed = await seedDemoData({ referenceDate });

    expect(firstSeed).toEqual(secondSeed);

    const [materials, attempts, items, wrongAnswers] = await Promise.all([
      prisma.material.count({
        where: {
          studentId: DEMO_STUDENT_ID,
        },
      }),
      prisma.attempt.count({
        where: {
          studentId: DEMO_STUDENT_ID,
        },
      }),
      prisma.attemptItem.count({
        where: {
          attempt: {
            studentId: DEMO_STUDENT_ID,
          },
        },
      }),
      prisma.wrongAnswer.count({
        where: {
          attemptItem: {
            attempt: {
              studentId: DEMO_STUDENT_ID,
            },
          },
        },
      }),
    ]);

    expect(materials).toBe(3);
    expect(attempts).toBe(6);
    expect(items).toBe(24);
    expect(wrongAnswers).toBe(12);

    const today = dateOnly(referenceDate);
    const rangeStart = dateOnly(addDaysUtc(referenceDate, -27));

    const overviewResponse = await GET_OVERVIEW(
      new Request(`http://localhost/api/v1/dashboard/overview?studentId=${DEMO_STUDENT_ID}&date=${today}`, {
        method: "GET",
        headers: {
          cookie: authCookie,
        },
      }),
    );
    const overviewBody = (await overviewResponse.json()) as {
      summary: { totalItems: number; wrongAnswers: number };
    };

    expect(overviewResponse.status).toBe(200);
    expect(overviewBody.summary.totalItems).toBeGreaterThan(0);
    expect(overviewBody.summary.wrongAnswers).toBeGreaterThan(0);

    const weeklyWeaknessResponse = await GET_WEAKNESS(
      new Request(`http://localhost/api/v1/dashboard/weakness?studentId=${DEMO_STUDENT_ID}&period=weekly`, {
        method: "GET",
        headers: {
          cookie: authCookie,
        },
      }),
    );
    const weeklyWeaknessBody = (await weeklyWeaknessResponse.json()) as {
      weakUnits: Array<{ unitName: string }>;
      categoryDistribution: Array<{ key: string }>;
    };

    expect(weeklyWeaknessResponse.status).toBe(200);
    expect(weeklyWeaknessBody.weakUnits).toHaveLength(1);
    expect(weeklyWeaknessBody.weakUnits[0]?.unitName).toBe("일차방정식");
    expect(weeklyWeaknessBody.categoryDistribution.length).toBeGreaterThan(0);

    const monthlyWeaknessResponse = await GET_WEAKNESS(
      new Request(`http://localhost/api/v1/dashboard/weakness?studentId=${DEMO_STUDENT_ID}&period=monthly`, {
        method: "GET",
        headers: {
          cookie: authCookie,
        },
      }),
    );
    const monthlyWeaknessBody = (await monthlyWeaknessResponse.json()) as {
      weakUnits: Array<{ unitName: string }>;
    };

    expect(monthlyWeaknessResponse.status).toBe(200);
    expect(monthlyWeaknessBody.weakUnits.length).toBeGreaterThanOrEqual(2);

    const trendsResponse = await GET_TRENDS(
      new Request(
        `http://localhost/api/v1/dashboard/trends?studentId=${DEMO_STUDENT_ID}&rangeStart=${rangeStart}&rangeEnd=${today}`,
        {
          method: "GET",
          headers: {
            cookie: authCookie,
          },
        },
      ),
    );
    const trendsBody = (await trendsResponse.json()) as {
      points: Array<{ totalItems: number }>;
    };

    expect(trendsResponse.status).toBe(200);
    expect(trendsBody.points.filter((point) => point.totalItems > 0).length).toBeGreaterThanOrEqual(2);

    const wrongAnswersResponse = await GET_WRONG_ANSWERS(
      new Request(`http://localhost/api/v1/wrong-answers?studentId=${DEMO_STUDENT_ID}&from=${rangeStart}&to=${today}`, {
        method: "GET",
        headers: {
          cookie: authCookie,
        },
      }),
    );
    const wrongAnswersBody = (await wrongAnswersResponse.json()) as {
      wrongAnswers: Array<{
        imagePath: string | null;
        categories: Array<{ key: string }>;
      }>;
    };

    expect(wrongAnswersResponse.status).toBe(200);
    expect(wrongAnswersBody.wrongAnswers.length).toBeGreaterThanOrEqual(6);
    expect(wrongAnswersBody.wrongAnswers.some((item) => item.categories.length === 0)).toBe(true);
    expect(wrongAnswersBody.wrongAnswers.some((item) => item.imagePath === null)).toBe(true);
  });

  it("clears only student-scoped demo data while preserving base records", async () => {
    await seedDemoData({ referenceDate: new Date() });
    await clearDemoData();

    const [guardian, student, categories, curriculumNodes, materials, attempts, items, wrongAnswers] = await Promise.all([
      prisma.user.findUnique({
        where: {
          email: "guardian@example.com",
        },
      }),
      prisma.student.findUnique({
        where: {
          id: DEMO_STUDENT_ID,
        },
      }),
      prisma.wrongAnswerCategory.count(),
      prisma.curriculumNode.count({
        where: {
          curriculumVersion: "2026.01",
          schoolLevel: SchoolLevel.middle,
          subject: Subject.math,
          grade: 1,
          semester: 1,
        },
      }),
      prisma.material.count({
        where: {
          studentId: DEMO_STUDENT_ID,
        },
      }),
      prisma.attempt.count({
        where: {
          studentId: DEMO_STUDENT_ID,
        },
      }),
      prisma.attemptItem.count({
        where: {
          attempt: {
            studentId: DEMO_STUDENT_ID,
          },
        },
      }),
      prisma.wrongAnswer.count({
        where: {
          attemptItem: {
            attempt: {
              studentId: DEMO_STUDENT_ID,
            },
          },
        },
      }),
    ]);

    expect(guardian).not.toBeNull();
    expect(student).not.toBeNull();
    expect(categories).toBeGreaterThanOrEqual(3);
    expect(curriculumNodes).toBeGreaterThanOrEqual(5);
    expect(materials).toBe(0);
    expect(attempts).toBe(0);
    expect(items).toBe(0);
    expect(wrongAnswers).toBe(0);
  });
});
