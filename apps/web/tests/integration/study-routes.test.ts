import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@prisma/client";
import { AUTH_COOKIE_NAME } from "@/modules/auth/constants";
import { signAuthToken } from "@/modules/auth/jwt";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    student: {
      findFirst: vi.fn(),
    },
    practiceSet: {
      findFirst: vi.fn(),
    },
    attempt: {
      findFirst: vi.fn(),
    },
    curriculumNode: {
      findFirst: vi.fn(),
    },
    studentUnitProgress: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { POST as POST_STUDY_SESSIONS } from "@/app/api/v1/student/study/sessions/route";
import { POST as POST_STUDY_SUBMIT } from "@/app/api/v1/student/study/sessions/[id]/submit/route";
import { PUT as PUT_STUDENT_WRONG_ANSWER } from "@/app/api/v1/student/wrong-answers/[id]/route";
import { POST as POST_GUARDIAN_REVIEW } from "@/app/api/v1/study/reviews/[sessionId]/route";
import { PUT as PUT_GUARDIAN_PROGRESS } from "@/app/api/v1/study/progress/[curriculumNodeId]/route";

const mockedFindStudent = vi.mocked(prisma.student.findFirst);
const mockedFindPracticeSet = vi.mocked(prisma.practiceSet.findFirst);
const mockedFindAttempt = vi.mocked(prisma.attempt.findFirst);
const mockedFindCurriculumNode = vi.mocked(prisma.curriculumNode.findFirst);
const mockedFindProgress = vi.mocked(prisma.studentUnitProgress.findUnique);

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

describe("/api/v1/student/study/* and /api/v1/study/*", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-08T00:00:00.000Z"));
    mockedFindStudent.mockReset();
    mockedFindPracticeSet.mockReset();
    mockedFindAttempt.mockReset();
    mockedFindCurriculumNode.mockReset();
    mockedFindProgress.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 403 when guardian tries to start a student study session", async () => {
    const authCookie = await createAuthCookie(UserRole.guardian);
    const request = new Request("http://localhost/api/v1/student/study/sessions", {
      method: "POST",
      headers: {
        cookie: authCookie,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        practiceSetId: "practice-set-1",
      }),
    });

    const response = await POST_STUDY_SESSIONS(request);
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("returns 404 when student submits a study session that is not theirs", async () => {
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
    mockedFindAttempt.mockResolvedValue(null as never);

    const authCookie = await createAuthCookie(UserRole.student);
    const request = new Request("http://localhost/api/v1/student/study/sessions/session-foreign/submit", {
      method: "POST",
      headers: {
        cookie: authCookie,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        elapsedSeconds: 45,
        answers: [
          {
            practiceProblemId: "problem-1",
            studentAnswer: "12",
          },
        ],
      }),
    });

    const response = await POST_STUDY_SUBMIT(request, {
      params: Promise.resolve({
        id: "session-foreign",
      }),
    });
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("queries current semester only when a student starts a practice session", async () => {
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
    mockedFindPracticeSet.mockResolvedValue(null as never);

    const authCookie = await createAuthCookie(UserRole.student);
    const request = new Request("http://localhost/api/v1/student/study/sessions", {
      method: "POST",
      headers: {
        cookie: authCookie,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        practiceSetId: "practice-set-1",
      }),
    });

    const response = await POST_STUDY_SESSIONS(request);

    expect(response.status).toBe(404);
    expect(mockedFindPracticeSet).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "practice-set-1",
          semester: 1,
        }),
      }),
    );
  });

  it("returns 403 when student calls guardian review route", async () => {
    const authCookie = await createAuthCookie(UserRole.student);
    const request = new Request("http://localhost/api/v1/study/reviews/session-1", {
      method: "POST",
      headers: {
        cookie: authCookie,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        feedback: "조금 더 천천히 계산해 보자",
        progressStatus: "review_needed",
      }),
    });

    const response = await POST_GUARDIAN_REVIEW(request, {
      params: Promise.resolve({
        sessionId: "session-1",
      }),
    });
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("returns 409 for invalid guardian progress transitions", async () => {
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
    mockedFindCurriculumNode.mockResolvedValue({
      id: "node-1",
      unitName: "일차방정식",
    } as never);
    mockedFindProgress.mockResolvedValue({
      studentId: "student-1",
      curriculumNodeId: "node-1",
      status: "completed",
      note: null,
      lastStudiedAt: null,
      reviewedAt: null,
      updatedByGuardianUserId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const authCookie = await createAuthCookie(UserRole.guardian);
    const request = new Request("http://localhost/api/v1/study/progress/node-1", {
      method: "PUT",
      headers: {
        cookie: authCookie,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        studentId: "student-1",
        status: "planned",
      }),
    });

    const response = await PUT_GUARDIAN_PROGRESS(request, {
      params: Promise.resolve({
        curriculumNodeId: "node-1",
      }),
    });
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("CONFLICT");
  });

  it("queries current semester only when guardian updates study progress", async () => {
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
    mockedFindCurriculumNode.mockResolvedValue(null as never);

    const authCookie = await createAuthCookie(UserRole.guardian);
    const request = new Request("http://localhost/api/v1/study/progress/node-1", {
      method: "PUT",
      headers: {
        cookie: authCookie,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        studentId: "student-1",
        status: "planned",
      }),
    });

    const response = await PUT_GUARDIAN_PROGRESS(request, {
      params: Promise.resolve({
        curriculumNodeId: "node-1",
      }),
    });

    expect(response.status).toBe(404);
    expect(mockedFindCurriculumNode).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "node-1",
          semester: 1,
        }),
      }),
    );
  });

  it("returns 403 when guardian calls student wrong-answer update route", async () => {
    const authCookie = await createAuthCookie(UserRole.guardian);
    const request = new Request("http://localhost/api/v1/student/wrong-answers/wa-1", {
      method: "PUT",
      headers: {
        cookie: authCookie,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        memo: "학생 메모 수정",
      }),
    });

    const response = await PUT_STUDENT_WRONG_ANSWER(request, {
      params: Promise.resolve({
        id: "wa-1",
      }),
    });
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });
});
