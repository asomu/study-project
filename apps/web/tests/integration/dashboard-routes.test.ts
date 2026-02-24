import { beforeEach, describe, expect, it, vi } from "vitest";
import { SchoolLevel, UserRole } from "@prisma/client";
import { AUTH_COOKIE_NAME } from "@/modules/auth/constants";
import { signAuthToken } from "@/modules/auth/jwt";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    student: {
      findFirst: vi.fn(),
    },
    curriculumNode: {
      findMany: vi.fn(),
    },
    attempt: {
      count: vi.fn(),
    },
    attemptItem: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    wrongAnswer: {
      count: vi.fn(),
    },
    wrongAnswerCategoryMap: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { GET as GET_OVERVIEW } from "@/app/api/v1/dashboard/overview/route";
import { GET as GET_WEAKNESS } from "@/app/api/v1/dashboard/weakness/route";
import { GET as GET_TRENDS } from "@/app/api/v1/dashboard/trends/route";

const mockedFindStudent = vi.mocked(prisma.student.findFirst);
const mockedFindCurriculumNodes = vi.mocked(prisma.curriculumNode.findMany);
const mockedFindAttemptItems = vi.mocked(prisma.attemptItem.findMany);
const mockedCountAttempts = vi.mocked(prisma.attempt.count);
const mockedCountAttemptItems = vi.mocked(prisma.attemptItem.count);
const mockedCountWrongAnswers = vi.mocked(prisma.wrongAnswer.count);
const mockedFindCategoryMaps = vi.mocked(prisma.wrongAnswerCategoryMap.findMany);

async function createAuthCookie() {
  const token = await signAuthToken({
    sub: "guardian-1",
    role: UserRole.guardian,
    email: "guardian@example.com",
  });

  return `${AUTH_COOKIE_NAME}=${token}`;
}

function ownedStudentFixture() {
  return {
    id: "student-1",
    guardianUserId: "guardian-1",
    name: "기본 학생",
    schoolLevel: SchoolLevel.middle,
    grade: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("dashboard API routes", () => {
  beforeEach(() => {
    mockedFindStudent.mockReset();
    mockedFindCurriculumNodes.mockReset();
    mockedFindAttemptItems.mockReset();
    mockedCountAttempts.mockReset();
    mockedCountAttemptItems.mockReset();
    mockedCountWrongAnswers.mockReset();
    mockedFindCategoryMaps.mockReset();
  });

  it("returns 401 for overview when authentication is missing", async () => {
    const request = new Request("http://localhost/api/v1/dashboard/overview?studentId=student-1", {
      method: "GET",
    });

    const response = await GET_OVERVIEW(request);
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("AUTH_REQUIRED");
  });

  it("returns 403 for overview when student is not owned", async () => {
    const authCookie = await createAuthCookie();
    mockedFindStudent.mockResolvedValue(null as never);

    const request = new Request("http://localhost/api/v1/dashboard/overview?studentId=student-2", {
      method: "GET",
      headers: {
        cookie: authCookie,
      },
    });

    const response = await GET_OVERVIEW(request);
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("returns 400 for overview with invalid date format", async () => {
    const authCookie = await createAuthCookie();

    const request = new Request("http://localhost/api/v1/dashboard/overview?studentId=student-1&date=2026-2-01", {
      method: "GET",
      headers: {
        cookie: authCookie,
      },
    });

    const response = await GET_OVERVIEW(request);
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for weakness with invalid period", async () => {
    const authCookie = await createAuthCookie();

    const request = new Request("http://localhost/api/v1/dashboard/weakness?studentId=student-1&period=yearly", {
      method: "GET",
      headers: {
        cookie: authCookie,
      },
    });

    const response = await GET_WEAKNESS(request);
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("filters weakness units by minimum attempts >= 3", async () => {
    const authCookie = await createAuthCookie();
    mockedFindStudent.mockResolvedValue(ownedStudentFixture() as never);
    mockedFindAttemptItems.mockResolvedValue([
      {
        curriculumNodeId: "unit-a",
        isCorrect: false,
        curriculumNode: { unitName: "소인수분해" },
      },
      {
        curriculumNodeId: "unit-a",
        isCorrect: true,
        curriculumNode: { unitName: "소인수분해" },
      },
      {
        curriculumNodeId: "unit-b",
        isCorrect: false,
        curriculumNode: { unitName: "정수와 유리수" },
      },
      {
        curriculumNodeId: "unit-b",
        isCorrect: false,
        curriculumNode: { unitName: "정수와 유리수" },
      },
      {
        curriculumNodeId: "unit-b",
        isCorrect: true,
        curriculumNode: { unitName: "정수와 유리수" },
      },
    ] as never);
    mockedFindCategoryMaps.mockResolvedValue([] as never);

    const request = new Request("http://localhost/api/v1/dashboard/weakness?studentId=student-1&period=weekly", {
      method: "GET",
      headers: {
        cookie: authCookie,
      },
    });

    const response = await GET_WEAKNESS(request);
    const body = (await response.json()) as {
      weakUnits: Array<{ curriculumNodeId: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.weakUnits).toHaveLength(1);
    expect(body.weakUnits[0]?.curriculumNodeId).toBe("unit-b");
  });

  it("returns trends default weekly buckets for recent 28 days", async () => {
    const authCookie = await createAuthCookie();
    vi.useFakeTimers();

    try {
      vi.setSystemTime(new Date("2026-02-21T12:00:00.000Z"));

      mockedFindStudent.mockResolvedValue(ownedStudentFixture() as never);
      mockedFindAttemptItems.mockResolvedValue([] as never);

      const request = new Request("http://localhost/api/v1/dashboard/trends?studentId=student-1", {
        method: "GET",
        headers: {
          cookie: authCookie,
        },
      });

      const response = await GET_TRENDS(request);
      const body = (await response.json()) as { points: Array<{ weekStart: string; weekEnd: string }> };

      expect(response.status).toBe(200);
      expect(body.points.length).toBeGreaterThanOrEqual(4);
      expect(body.points.length).toBeLessThanOrEqual(5);

      for (const point of body.points) {
        expect(new Date(`${point.weekStart}T00:00:00.000Z`).getUTCDay()).toBe(1);
        expect(new Date(`${point.weekEnd}T00:00:00.000Z`).getUTCDay()).toBe(0);
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it("aggregates overview metrics from attempt_items data", async () => {
    const authCookie = await createAuthCookie();
    mockedFindStudent.mockResolvedValue(ownedStudentFixture() as never);
    mockedFindCurriculumNodes.mockResolvedValue([
      {
        id: "node-1",
        curriculumVersion: "2026.01",
      },
      {
        id: "node-2",
        curriculumVersion: "2026.01",
      },
    ] as never);
    mockedFindAttemptItems
      .mockResolvedValueOnce([
        {
          curriculumNodeId: "node-1",
        },
      ] as never)
      .mockResolvedValueOnce([
        {
          curriculumNodeId: "node-1",
          isCorrect: true,
          difficulty: 3,
          attempt: {
            attemptDate: new Date("2026-02-01T00:00:00.000Z"),
          },
        },
        {
          curriculumNodeId: "node-1",
          isCorrect: false,
          difficulty: null,
          attempt: {
            attemptDate: new Date("2026-02-10T00:00:00.000Z"),
          },
        },
        {
          curriculumNodeId: "node-2",
          isCorrect: true,
          difficulty: 5,
          attempt: {
            attemptDate: new Date("2026-02-20T00:00:00.000Z"),
          },
        },
      ] as never);
    mockedCountAttempts.mockResolvedValue(2 as never);
    mockedCountAttemptItems.mockResolvedValue(3 as never);
    mockedCountWrongAnswers.mockResolvedValue(1 as never);

    const request = new Request("http://localhost/api/v1/dashboard/overview?studentId=student-1&date=2026-02-21", {
      method: "GET",
      headers: {
        cookie: authCookie,
      },
    });

    const response = await GET_OVERVIEW(request);
    const body = (await response.json()) as {
      progress: { coveredUnits: number; totalUnits: number; actualPct: number };
      mastery: { recentAccuracyPct: number };
      summary: { totalAttempts: number; totalItems: number; wrongAnswers: number };
    };

    expect(response.status).toBe(200);
    expect(body.progress.coveredUnits).toBe(1);
    expect(body.progress.totalUnits).toBe(2);
    expect(body.progress.actualPct).toBe(50);
    expect(body.mastery.recentAccuracyPct).toBeCloseTo(66.7, 1);
    expect(body.summary.totalAttempts).toBe(2);
    expect(body.summary.totalItems).toBe(3);
    expect(body.summary.wrongAnswers).toBe(1);
  });

  it("uses asOfDate boundary when counting covered units in overview", async () => {
    const authCookie = await createAuthCookie();
    mockedFindStudent.mockResolvedValue(ownedStudentFixture() as never);
    mockedFindCurriculumNodes.mockResolvedValue([
      {
        id: "node-1",
        curriculumVersion: "2026.01",
      },
    ] as never);
    mockedFindAttemptItems
      .mockResolvedValueOnce([
        {
          curriculumNodeId: "node-1",
        },
      ] as never)
      .mockResolvedValueOnce([] as never);
    mockedCountAttempts.mockResolvedValue(0 as never);
    mockedCountAttemptItems.mockResolvedValue(0 as never);
    mockedCountWrongAnswers.mockResolvedValue(0 as never);

    const request = new Request("http://localhost/api/v1/dashboard/overview?studentId=student-1&date=2026-02-21", {
      method: "GET",
      headers: {
        cookie: authCookie,
      },
    });

    const response = await GET_OVERVIEW(request);

    expect(response.status).toBe(200);

    const coveredUnitsQuery = mockedFindAttemptItems.mock.calls[0]?.[0];
    expect(coveredUnitsQuery).toEqual(
      expect.objectContaining({
        where: expect.objectContaining({
          attempt: expect.objectContaining({
            attemptDate: expect.objectContaining({
              lte: new Date("2026-02-21T23:59:59.999Z"),
            }),
          }),
        }),
      }),
    );
  });

  it("counts covered units only within resolved curriculum version", async () => {
    const authCookie = await createAuthCookie();
    mockedFindStudent.mockResolvedValue(ownedStudentFixture() as never);
    mockedFindCurriculumNodes.mockResolvedValue([
      {
        id: "node-current",
        curriculumVersion: "2026.01",
      },
    ] as never);
    mockedFindAttemptItems
      .mockResolvedValueOnce([
        {
          curriculumNodeId: "node-current",
        },
        {
          curriculumNodeId: "node-legacy",
        },
      ] as never)
      .mockResolvedValueOnce([] as never);
    mockedCountAttempts.mockResolvedValue(0 as never);
    mockedCountAttemptItems.mockResolvedValue(0 as never);
    mockedCountWrongAnswers.mockResolvedValue(0 as never);

    const request = new Request("http://localhost/api/v1/dashboard/overview?studentId=student-1&date=2026-02-21", {
      method: "GET",
      headers: {
        cookie: authCookie,
      },
    });

    const response = await GET_OVERVIEW(request);
    const body = (await response.json()) as {
      progress: {
        coveredUnits: number;
        totalUnits: number;
        actualPct: number;
      };
    };

    expect(response.status).toBe(200);
    expect(body.progress.coveredUnits).toBe(1);
    expect(body.progress.totalUnits).toBe(1);
    expect(body.progress.actualPct).toBe(100);
  });
});
