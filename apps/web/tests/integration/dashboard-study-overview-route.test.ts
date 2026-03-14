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
    practiceSet: {
      findMany: vi.fn(),
    },
    studentUnitProgress: {
      findMany: vi.fn(),
    },
    conceptLesson: {
      findMany: vi.fn(),
    },
    attempt: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { GET as GET_STUDY_OVERVIEW } from "@/app/api/v1/dashboard/study-overview/route";

const mockedFindStudent = vi.mocked(prisma.student.findFirst);
const mockedFindCurriculumNodes = vi.mocked(prisma.curriculumNode.findMany);
const mockedFindPracticeSets = vi.mocked(prisma.practiceSet.findMany);
const mockedFindProgressRows = vi.mocked(prisma.studentUnitProgress.findMany);
const mockedFindConceptLessons = vi.mocked(prisma.conceptLesson.findMany);
const mockedFindAttempts = vi.mocked(prisma.attempt.findMany);

function createOwnedStudentFixture() {
  return {
    id: "student-1",
    guardianUserId: "guardian-1",
    loginUserId: "student-user-1",
    name: "학생 1",
    schoolLevel: "middle",
    grade: 1,
    createdAt: new Date("2026-03-01T00:00:00.000Z"),
    updatedAt: new Date("2026-03-01T00:00:00.000Z"),
  };
}

async function createAuthCookie(role: UserRole) {
  const token = await signAuthToken({
    sub: role === UserRole.student ? "student-user-1" : "guardian-1",
    role,
    email: role === UserRole.guardian ? "guardian@example.com" : undefined,
    loginId: role === UserRole.student ? "student-login-1" : "guardian@example.com",
    name: role === UserRole.student ? "학생 1" : "보호자 1",
    studentId: role === UserRole.student ? "student-1" : undefined,
  });

  return `${AUTH_COOKIE_NAME}=${token}`;
}

describe("GET /api/v1/dashboard/study-overview", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T00:00:00.000Z"));
    mockedFindStudent.mockReset();
    mockedFindCurriculumNodes.mockReset();
    mockedFindPracticeSets.mockReset();
    mockedFindProgressRows.mockReset();
    mockedFindConceptLessons.mockReset();
    mockedFindAttempts.mockReset();
  });

  it("returns 403 when a student tries to read guardian study overview", async () => {
    const authCookie = await createAuthCookie(UserRole.student);
    const request = new Request("http://localhost/api/v1/dashboard/study-overview?studentId=student-1", {
      method: "GET",
      headers: {
        cookie: authCookie,
      },
    });

    const response = await GET_STUDY_OVERVIEW(request);
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("returns 403 when the guardian does not own the student", async () => {
    const authCookie = await createAuthCookie(UserRole.guardian);
    mockedFindStudent.mockResolvedValue(null as never);

    const request = new Request("http://localhost/api/v1/dashboard/study-overview?studentId=student-2", {
      method: "GET",
      headers: {
        cookie: authCookie,
      },
    });

    const response = await GET_STUDY_OVERVIEW(request);
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("returns 400 for invalid date format", async () => {
    const authCookie = await createAuthCookie(UserRole.guardian);

    const request = new Request("http://localhost/api/v1/dashboard/study-overview?studentId=student-1&date=2026-3-15", {
      method: "GET",
      headers: {
        cookie: authCookie,
      },
    });

    const response = await GET_STUDY_OVERVIEW(request);
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns a stable empty response shape when no study data exists", async () => {
    const authCookie = await createAuthCookie(UserRole.guardian);
    mockedFindStudent.mockResolvedValue(createOwnedStudentFixture() as never);
    mockedFindCurriculumNodes.mockResolvedValue([
      {
        id: "node-1",
        unitName: "소인수분해",
        sortOrder: 1,
      },
      {
        id: "node-2",
        unitName: "정수와 유리수",
        sortOrder: 2,
      },
    ] as never);
    mockedFindPracticeSets.mockResolvedValue([] as never);
    mockedFindProgressRows.mockResolvedValue([] as never);
    mockedFindConceptLessons.mockResolvedValue([] as never);
    mockedFindAttempts.mockResolvedValue([] as never);

    const request = new Request("http://localhost/api/v1/dashboard/study-overview?studentId=student-1", {
      method: "GET",
      headers: {
        cookie: authCookie,
      },
    });

    const response = await GET_STUDY_OVERVIEW(request);
    const body = (await response.json()) as {
      student: { id: string; name: string };
      summary: {
        pendingReviews: number;
        reviewNeededUnits: number;
        inProgressUnits: number;
        recentStudyMinutes7d: number;
        submittedSessions7d: number;
      };
      progressSummary: Record<"planned" | "in_progress" | "review_needed" | "completed", number>;
      recommendedActions: Array<unknown>;
      reviewQueuePreview: Array<unknown>;
      attentionUnits: Array<{ curriculumNodeId: string; status: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.student).toEqual({
      id: "student-1",
      name: "학생 1",
      schoolLevel: "middle",
      grade: 1,
    });
    expect(body.summary).toEqual({
      pendingReviews: 0,
      reviewNeededUnits: 0,
      inProgressUnits: 0,
      recentStudyMinutes7d: 0,
      submittedSessions7d: 0,
    });
    expect(body.progressSummary).toEqual({
      planned: 2,
      in_progress: 0,
      review_needed: 0,
      completed: 0,
    });
    expect(body.recommendedActions).toEqual([]);
    expect(body.reviewQueuePreview).toEqual([]);
    expect(body.attentionUnits).toEqual([
      expect.objectContaining({
        curriculumNodeId: "node-1",
        status: "planned",
      }),
      expect.objectContaining({
        curriculumNodeId: "node-2",
        status: "planned",
      }),
    ]);
    expect(mockedFindCurriculumNodes).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          semester: 1,
        }),
      }),
    );
  });
});
