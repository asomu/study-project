import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@prisma/client";
import { AUTH_COOKIE_NAME } from "@/modules/auth/constants";
import { signAuthToken } from "@/modules/auth/jwt";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    student: {
      findFirst: vi.fn(),
    },
    attempt: {
      count: vi.fn(),
    },
    attemptItem: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    wrongAnswer: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { GET as GET_OVERVIEW } from "@/app/api/v1/student/dashboard/overview/route";
import { GET as GET_TRENDS } from "@/app/api/v1/student/dashboard/trends/route";

const mockedFindStudent = vi.mocked(prisma.student.findFirst);
const mockedCountAttempts = vi.mocked(prisma.attempt.count);
const mockedFindAttemptItems = vi.mocked(prisma.attemptItem.findMany);
const mockedCountAttemptItems = vi.mocked(prisma.attemptItem.count);
const mockedFindWrongAnswers = vi.mocked(prisma.wrongAnswer.findMany);

async function createStudentAuthCookie() {
  const token = await signAuthToken({
    sub: "student-user-1",
    role: UserRole.student,
    loginId: "student-math",
    name: "학생 1",
    studentId: "student-1",
  });

  return `${AUTH_COOKIE_NAME}=${token}`;
}

async function createGuardianAuthCookie() {
  const token = await signAuthToken({
    sub: "guardian-1",
    role: UserRole.guardian,
    email: "guardian@example.com",
    loginId: "guardian@example.com",
    name: "기본 보호자",
  });

  return `${AUTH_COOKIE_NAME}=${token}`;
}

describe("/api/v1/student/dashboard/*", () => {
  beforeEach(() => {
    mockedFindStudent.mockReset();
    mockedCountAttempts.mockReset();
    mockedFindAttemptItems.mockReset();
    mockedCountAttemptItems.mockReset();
    mockedFindWrongAnswers.mockReset();
  });

  it("returns 403 when guardian accesses student dashboard overview route", async () => {
    const authCookie = await createGuardianAuthCookie();
    const request = new Request("http://localhost/api/v1/student/dashboard/overview", {
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

  it("returns student overview for linked student account", async () => {
    const authCookie = await createStudentAuthCookie();

    mockedFindStudent.mockResolvedValue({
      id: "student-1",
      guardianUserId: "guardian-1",
      loginUserId: "student-user-1",
      name: "학생 1",
      schoolLevel: "middle",
      grade: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    mockedFindAttemptItems
      .mockResolvedValueOnce([{ isCorrect: true }] as never)
      .mockResolvedValueOnce([
        {
          curriculumNodeId: "node-1",
          isCorrect: false,
          curriculumNode: {
            unitName: "일차방정식",
          },
        },
      ] as never)
      .mockResolvedValueOnce([
        {
          curriculumNodeId: "node-1",
          isCorrect: false,
          curriculumNode: {
            unitName: "일차방정식",
          },
        },
        {
          curriculumNodeId: "node-1",
          isCorrect: true,
          curriculumNode: {
            unitName: "일차방정식",
          },
        },
      ] as never);
    mockedCountAttempts.mockResolvedValue(2 as never);
    mockedCountAttemptItems.mockResolvedValue(8 as never);
    mockedFindWrongAnswers.mockResolvedValue([] as never);

    const request = new Request("http://localhost/api/v1/student/dashboard/overview", {
      method: "GET",
      headers: {
        cookie: authCookie,
      },
    });

    const response = await GET_OVERVIEW(request);
    const body = (await response.json()) as { student: { id: string }; summary: { totalItems: number } };

    expect(response.status).toBe(200);
    expect(body.student.id).toBe("student-1");
    expect(body.summary.totalItems).toBe(8);
  });

  it("returns weekly trend points for linked student account", async () => {
    const authCookie = await createStudentAuthCookie();

    mockedFindStudent.mockResolvedValue({
      id: "student-1",
      guardianUserId: "guardian-1",
      loginUserId: "student-user-1",
      name: "학생 1",
      schoolLevel: "middle",
      grade: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    mockedFindAttemptItems.mockResolvedValue([
      {
        curriculumNodeId: "node-1",
        isCorrect: true,
        difficulty: 3,
        attempt: {
          attemptDate: new Date("2026-03-03T00:00:00.000Z"),
        },
      },
    ] as never);

    const request = new Request("http://localhost/api/v1/student/dashboard/trends", {
      method: "GET",
      headers: {
        cookie: authCookie,
      },
    });

    const response = await GET_TRENDS(request);
    const body = (await response.json()) as { points: Array<{ totalItems: number }> };

    expect(response.status).toBe(200);
    expect(body.points.length).toBeGreaterThan(0);
  });
});
