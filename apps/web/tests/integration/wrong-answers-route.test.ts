import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@prisma/client";
import { signAuthToken } from "@/modules/auth/jwt";
import { AUTH_COOKIE_NAME } from "@/modules/auth/constants";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    student: {
      findFirst: vi.fn(),
    },
    attemptItem: {
      findFirst: vi.fn(),
    },
    wrongAnswer: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/v1/wrong-answers/route";

const mockedFindStudent = vi.mocked(prisma.student.findFirst);
const mockedFindAttemptItem = vi.mocked(prisma.attemptItem.findFirst);

async function createAuthCookie() {
  const token = await signAuthToken({
    sub: "guardian-1",
    role: UserRole.guardian,
    email: "guardian@example.com",
  });

  return `${AUTH_COOKIE_NAME}=${token}`;
}

describe("/api/v1/wrong-answers", () => {
  beforeEach(() => {
    mockedFindStudent.mockReset();
    mockedFindAttemptItem.mockReset();
  });

  it("returns 400 when creating wrong-answer for correct item", async () => {
    const authCookie = await createAuthCookie();

    mockedFindAttemptItem.mockResolvedValue({
      id: "attempt-item-1",
      attemptId: "attempt-1",
      curriculumNodeId: "node-1",
      problemNo: 1,
      isCorrect: true,
      difficulty: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      attempt: {
        id: "attempt-1",
        studentId: "student-1",
        materialId: "material-1",
        attemptDate: new Date(),
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        student: { id: "student-1", guardianUserId: "guardian-1" },
        material: { id: "material-1" },
      },
    } as never);

    const request = new Request("http://localhost/api/v1/wrong-answers", {
      method: "POST",
      headers: {
        cookie: authCookie,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        attemptItemId: "attempt-item-1",
        memo: "오답 메모",
      }),
    });

    const response = await POST(request);
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 403 when querying wrong-answers for not-owned student", async () => {
    const authCookie = await createAuthCookie();
    mockedFindStudent.mockResolvedValue(null as never);

    const request = new Request("http://localhost/api/v1/wrong-answers?studentId=student-2", {
      method: "GET",
      headers: {
        cookie: authCookie,
      },
    });

    const response = await GET(request);
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });
});
