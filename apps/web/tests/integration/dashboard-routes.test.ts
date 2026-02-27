import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@prisma/client";
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
import {
  createOwnedStudentFixture,
  DASHBOARD_CURRICULUM_NODES_FIXTURE,
  DASHBOARD_FIXED_NOW,
  DASHBOARD_MONTHLY_RANGE_END,
  DASHBOARD_MONTHLY_RANGE_START,
  DASHBOARD_TRENDS_ROUTE_ITEMS_FIXTURE,
  DASHBOARD_TRENDS_ROUTE_RANGE,
  DASHBOARD_WAVE2_DEFAULT_AS_OF_DATE,
  DASHBOARD_WAVE2_DEFAULT_AS_OF_DATE_END,
  DASHBOARD_WAVE2_DEFAULT_SEMESTER_START,
  DASHBOARD_WAVE2_FIXED_NOW,
  DASHBOARD_WAVE2_OVERVIEW_EMPTY_EXPECTED,
  DASHBOARD_WAVE2_SECOND_SEMESTER_DATE,
  DASHBOARD_WAVE2_SECOND_SEMESTER_EXPECTED,
  DASHBOARD_WAVE2_TRENDS_PARTIAL_EXPECTED_POINTS,
  DASHBOARD_WAVE2_TRENDS_PARTIAL_RANGE,
  DASHBOARD_WAVE2_TRENDS_PARTIAL_ROUTE_ITEMS_FIXTURE,
  DASHBOARD_WAVE2_TRENDS_RANGE_END_ONLY,
} from "../fixtures/dashboard-fixtures";

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

  it("uses default today date for overview when date query is omitted", async () => {
    const authCookie = await createAuthCookie();
    vi.useFakeTimers();

    try {
      vi.setSystemTime(DASHBOARD_WAVE2_FIXED_NOW);
      mockedFindStudent.mockResolvedValue(createOwnedStudentFixture() as never);
      mockedFindCurriculumNodes.mockResolvedValue([...DASHBOARD_CURRICULUM_NODES_FIXTURE] as never);
      mockedFindAttemptItems.mockResolvedValueOnce([] as never).mockResolvedValueOnce([] as never);
      mockedCountAttempts.mockResolvedValue(0 as never);
      mockedCountAttemptItems.mockResolvedValue(0 as never);
      mockedCountWrongAnswers.mockResolvedValue(0 as never);

      const request = new Request("http://localhost/api/v1/dashboard/overview?studentId=student-1", {
        method: "GET",
        headers: {
          cookie: authCookie,
        },
      });

      const response = await GET_OVERVIEW(request);
      const body = (await response.json()) as {
        summary: { asOfDate: string };
      };

      expect(response.status).toBe(200);
      expect(body.summary.asOfDate).toBe(DASHBOARD_WAVE2_DEFAULT_AS_OF_DATE);

      const coveredUnitsQuery = mockedFindAttemptItems.mock.calls[0]?.[0];
      expect(coveredUnitsQuery).toEqual(
        expect.objectContaining({
          where: expect.objectContaining({
            attempt: expect.objectContaining({
              attemptDate: expect.objectContaining({
                gte: DASHBOARD_WAVE2_DEFAULT_SEMESTER_START,
                lte: DASHBOARD_WAVE2_DEFAULT_AS_OF_DATE_END,
              }),
            }),
          }),
        }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns 401 for weakness when authentication is missing", async () => {
    const request = new Request("http://localhost/api/v1/dashboard/weakness?studentId=student-1&period=weekly", {
      method: "GET",
    });

    const response = await GET_WEAKNESS(request);
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("AUTH_REQUIRED");
  });

  it("returns 403 for weakness when student is not owned", async () => {
    const authCookie = await createAuthCookie();
    mockedFindStudent.mockResolvedValue(null as never);

    const request = new Request("http://localhost/api/v1/dashboard/weakness?studentId=student-2&period=weekly", {
      method: "GET",
      headers: {
        cookie: authCookie,
      },
    });

    const response = await GET_WEAKNESS(request);
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
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

  it("uses monthly boundary (today-29 .. endOfDay(today)) for weakness query", async () => {
    const authCookie = await createAuthCookie();
    vi.useFakeTimers();

    try {
      vi.setSystemTime(DASHBOARD_FIXED_NOW);
      mockedFindStudent.mockResolvedValue(createOwnedStudentFixture() as never);
      mockedFindAttemptItems.mockResolvedValue([] as never);
      mockedFindCategoryMaps.mockResolvedValue([] as never);

      const request = new Request("http://localhost/api/v1/dashboard/weakness?studentId=student-1&period=monthly", {
        method: "GET",
        headers: {
          cookie: authCookie,
        },
      });

      const response = await GET_WEAKNESS(request);
      expect(response.status).toBe(200);

      const itemQuery = mockedFindAttemptItems.mock.calls[0]?.[0];
      expect(itemQuery).toEqual(
        expect.objectContaining({
          where: expect.objectContaining({
            attempt: expect.objectContaining({
              attemptDate: expect.objectContaining({
                gte: DASHBOARD_MONTHLY_RANGE_START,
                lte: DASHBOARD_MONTHLY_RANGE_END,
              }),
            }),
          }),
        }),
      );

      const categoryQuery = mockedFindCategoryMaps.mock.calls[0]?.[0];
      expect(categoryQuery).toEqual(
        expect.objectContaining({
          where: expect.objectContaining({
            wrongAnswer: expect.objectContaining({
              attemptItem: expect.objectContaining({
                attempt: expect.objectContaining({
                  attemptDate: expect.objectContaining({
                    gte: DASHBOARD_MONTHLY_RANGE_START,
                    lte: DASHBOARD_MONTHLY_RANGE_END,
                  }),
                }),
              }),
            }),
          }),
        }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("filters weakness units by minimum attempts >= 3", async () => {
    const authCookie = await createAuthCookie();
    mockedFindStudent.mockResolvedValue(createOwnedStudentFixture() as never);
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

  it("returns 401 for trends when authentication is missing", async () => {
    const request = new Request("http://localhost/api/v1/dashboard/trends?studentId=student-1", {
      method: "GET",
    });

    const response = await GET_TRENDS(request);
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("AUTH_REQUIRED");
  });

  it("returns 403 for trends when student is not owned", async () => {
    const authCookie = await createAuthCookie();
    mockedFindStudent.mockResolvedValue(null as never);

    const request = new Request("http://localhost/api/v1/dashboard/trends?studentId=student-2", {
      method: "GET",
      headers: {
        cookie: authCookie,
      },
    });

    const response = await GET_TRENDS(request);
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("returns 400 for trends with invalid date format", async () => {
    const authCookie = await createAuthCookie();

    const request = new Request("http://localhost/api/v1/dashboard/trends?studentId=student-1&rangeStart=2026-2-01", {
      method: "GET",
      headers: {
        cookie: authCookie,
      },
    });

    const response = await GET_TRENDS(request);
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for trends when rangeStart is after rangeEnd", async () => {
    const authCookie = await createAuthCookie();

    const request = new Request(
      "http://localhost/api/v1/dashboard/trends?studentId=student-1&rangeStart=2026-02-15&rangeEnd=2026-02-01",
      {
        method: "GET",
        headers: {
          cookie: authCookie,
        },
      },
    );

    const response = await GET_TRENDS(request);
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns trends default weekly buckets for recent 28 days", async () => {
    const authCookie = await createAuthCookie();
    vi.useFakeTimers();

    try {
      vi.setSystemTime(new Date("2026-02-21T12:00:00.000Z"));

      mockedFindStudent.mockResolvedValue(createOwnedStudentFixture() as never);
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

  it("aggregates trends points for explicit weekly range including boundaries", async () => {
    const authCookie = await createAuthCookie();
    mockedFindStudent.mockResolvedValue(createOwnedStudentFixture() as never);
    mockedFindAttemptItems.mockResolvedValue([...DASHBOARD_TRENDS_ROUTE_ITEMS_FIXTURE] as never);

    const request = new Request(
      `http://localhost/api/v1/dashboard/trends?studentId=student-1&rangeStart=${DASHBOARD_TRENDS_ROUTE_RANGE.rangeStart}&rangeEnd=${DASHBOARD_TRENDS_ROUTE_RANGE.rangeEnd}`,
      {
        method: "GET",
        headers: {
          cookie: authCookie,
        },
      },
    );

    const response = await GET_TRENDS(request);
    const body = (await response.json()) as {
      points: Array<{
        weekStart: string;
        weekEnd: string;
        totalItems: number;
        correctItems: number;
        accuracyPct: number;
        masteryScorePct: number;
      }>;
    };

    expect(response.status).toBe(200);
    expect(body.points).toEqual([
      {
        weekStart: "2026-02-02",
        weekEnd: "2026-02-08",
        totalItems: 2,
        correctItems: 1,
        accuracyPct: 50,
        masteryScorePct: 51.9,
      },
      {
        weekStart: "2026-02-09",
        weekEnd: "2026-02-15",
        totalItems: 2,
        correctItems: 2,
        accuracyPct: 100,
        masteryScorePct: 100,
      },
    ]);

    const trendsQuery = mockedFindAttemptItems.mock.calls[0]?.[0];
    expect(trendsQuery).toEqual(
      expect.objectContaining({
        where: expect.objectContaining({
          attempt: expect.objectContaining({
            attemptDate: expect.objectContaining({
              gte: new Date("2026-02-02T00:00:00.000Z"),
              lte: new Date("2026-02-15T23:59:59.999Z"),
            }),
          }),
        }),
      }),
    );
  });

  it("aggregates trends for partial weekly buckets in explicit range", async () => {
    const authCookie = await createAuthCookie();
    mockedFindStudent.mockResolvedValue(createOwnedStudentFixture() as never);
    mockedFindAttemptItems.mockResolvedValue([...DASHBOARD_WAVE2_TRENDS_PARTIAL_ROUTE_ITEMS_FIXTURE] as never);

    const request = new Request(
      `http://localhost/api/v1/dashboard/trends?studentId=student-1&rangeStart=${DASHBOARD_WAVE2_TRENDS_PARTIAL_RANGE.rangeStart}&rangeEnd=${DASHBOARD_WAVE2_TRENDS_PARTIAL_RANGE.rangeEnd}`,
      {
        method: "GET",
        headers: {
          cookie: authCookie,
        },
      },
    );

    const response = await GET_TRENDS(request);
    const body = (await response.json()) as {
      points: Array<{
        weekStart: string;
        weekEnd: string;
        totalItems: number;
        correctItems: number;
        accuracyPct: number;
        masteryScorePct: number;
      }>;
    };

    expect(response.status).toBe(200);
    expect(body.points).toEqual([...DASHBOARD_WAVE2_TRENDS_PARTIAL_EXPECTED_POINTS]);

    const trendsQuery = mockedFindAttemptItems.mock.calls[0]?.[0];
    expect(trendsQuery).toEqual(
      expect.objectContaining({
        where: expect.objectContaining({
          attempt: expect.objectContaining({
            attemptDate: expect.objectContaining({
              gte: new Date("2026-02-04T00:00:00.000Z"),
              lte: new Date("2026-02-18T23:59:59.999Z"),
            }),
          }),
        }),
      }),
    );
  });

  it("uses rangeEnd-only default start range for trends", async () => {
    const authCookie = await createAuthCookie();
    mockedFindStudent.mockResolvedValue(createOwnedStudentFixture() as never);
    mockedFindAttemptItems.mockResolvedValue([] as never);

    const request = new Request(
      `http://localhost/api/v1/dashboard/trends?studentId=student-1&rangeEnd=${DASHBOARD_WAVE2_TRENDS_RANGE_END_ONLY.rangeEnd}`,
      {
        method: "GET",
        headers: {
          cookie: authCookie,
        },
      },
    );

    const response = await GET_TRENDS(request);
    const body = (await response.json()) as {
      points: Array<{ weekStart: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.points.at(0)?.weekStart).toBe(DASHBOARD_WAVE2_TRENDS_RANGE_END_ONLY.expectedFirstWeekStart);
    expect(body.points.at(-1)?.weekStart).toBe(DASHBOARD_WAVE2_TRENDS_RANGE_END_ONLY.expectedLastWeekStart);

    const trendsQuery = mockedFindAttemptItems.mock.calls[0]?.[0];
    expect(trendsQuery).toEqual(
      expect.objectContaining({
        where: expect.objectContaining({
          attempt: expect.objectContaining({
            attemptDate: expect.objectContaining({
              gte: DASHBOARD_WAVE2_TRENDS_RANGE_END_ONLY.expectedRangeStart,
              lte: DASHBOARD_WAVE2_TRENDS_RANGE_END_ONLY.expectedRangeEnd,
            }),
          }),
        }),
      }),
    );
  });

  it("aggregates overview metrics from attempt_items data", async () => {
    const authCookie = await createAuthCookie();
    mockedFindStudent.mockResolvedValue(createOwnedStudentFixture() as never);
    mockedFindCurriculumNodes.mockResolvedValue([...DASHBOARD_CURRICULUM_NODES_FIXTURE] as never);
    mockedFindAttemptItems
      .mockResolvedValueOnce([
        {
          curriculumNodeId: "node-current-1",
        },
      ] as never)
      .mockResolvedValueOnce([
        {
          curriculumNodeId: "node-current-1",
          isCorrect: true,
          difficulty: 3,
          attempt: {
            attemptDate: new Date("2026-02-01T00:00:00.000Z"),
          },
        },
        {
          curriculumNodeId: "node-current-1",
          isCorrect: false,
          difficulty: null,
          attempt: {
            attemptDate: new Date("2026-02-10T00:00:00.000Z"),
          },
        },
        {
          curriculumNodeId: "node-current-2",
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
    mockedFindStudent.mockResolvedValue(createOwnedStudentFixture() as never);
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
    mockedFindStudent.mockResolvedValue(createOwnedStudentFixture() as never);
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

  it("returns zero actual progress when active curriculum nodes are empty", async () => {
    const authCookie = await createAuthCookie();
    mockedFindStudent.mockResolvedValue(createOwnedStudentFixture() as never);
    mockedFindCurriculumNodes.mockResolvedValue([] as never);
    mockedFindAttemptItems
      .mockResolvedValueOnce([
        {
          curriculumNodeId: "node-any",
        },
      ] as never)
      .mockResolvedValueOnce([] as never);
    mockedCountAttempts.mockResolvedValue(0 as never);
    mockedCountAttemptItems.mockResolvedValue(0 as never);
    mockedCountWrongAnswers.mockResolvedValue(0 as never);

    const request = new Request("http://localhost/api/v1/dashboard/overview?studentId=student-1&date=2026-02-27", {
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
    expect(body.progress).toMatchObject(DASHBOARD_WAVE2_OVERVIEW_EMPTY_EXPECTED);
  });

  it("uses second-semester boundary for overview and computes recommended progress", async () => {
    const authCookie = await createAuthCookie();
    mockedFindStudent.mockResolvedValue(createOwnedStudentFixture() as never);
    mockedFindCurriculumNodes.mockResolvedValue([
      {
        id: "node-s2-1",
        curriculumVersion: "2026.01",
      },
    ] as never);
    mockedFindAttemptItems.mockResolvedValueOnce([] as never).mockResolvedValueOnce([] as never);
    mockedCountAttempts.mockResolvedValue(0 as never);
    mockedCountAttemptItems.mockResolvedValue(0 as never);
    mockedCountWrongAnswers.mockResolvedValue(0 as never);

    const request = new Request(
      `http://localhost/api/v1/dashboard/overview?studentId=student-1&date=${DASHBOARD_WAVE2_SECOND_SEMESTER_DATE}`,
      {
        method: "GET",
        headers: {
          cookie: authCookie,
        },
      },
    );

    const response = await GET_OVERVIEW(request);
    const body = (await response.json()) as {
      progress: {
        recommendedPct: number;
      };
    };

    expect(response.status).toBe(200);
    expect(body.progress.recommendedPct).toBe(DASHBOARD_WAVE2_SECOND_SEMESTER_EXPECTED.recommendedPct);

    const coveredUnitsQuery = mockedFindAttemptItems.mock.calls[0]?.[0];
    expect(coveredUnitsQuery).toEqual(
      expect.objectContaining({
        where: expect.objectContaining({
          attempt: expect.objectContaining({
            attemptDate: expect.objectContaining({
              gte: DASHBOARD_WAVE2_SECOND_SEMESTER_EXPECTED.semesterStart,
              lte: DASHBOARD_WAVE2_SECOND_SEMESTER_EXPECTED.asOfDateEnd,
            }),
          }),
        }),
      }),
    );
  });
});
