import { beforeEach, describe, expect, it, vi } from "vitest";
import { SchoolLevel, Subject, UserRole } from "@prisma/client";
import { signAuthToken } from "@/modules/auth/jwt";
import { AUTH_COOKIE_NAME } from "@/modules/auth/constants";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    student: {
      findFirst: vi.fn(),
    },
    material: {
      findFirst: vi.fn(),
    },
    attempt: {
      create: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/v1/attempts/route";

const mockedFindStudent = vi.mocked(prisma.student.findFirst);
const mockedFindMaterial = vi.mocked(prisma.material.findFirst);
const mockedCreateAttempt = vi.mocked(prisma.attempt.create);

async function createAuthCookie() {
  const token = await signAuthToken({
    sub: "guardian-1",
    role: UserRole.guardian,
    email: "guardian@example.com",
  });

  return `${AUTH_COOKIE_NAME}=${token}`;
}

describe("POST /api/v1/attempts", () => {
  beforeEach(() => {
    mockedFindStudent.mockReset();
    mockedFindMaterial.mockReset();
    mockedCreateAttempt.mockReset();
  });

  it("returns 400 when material and student chain does not match", async () => {
    const authCookie = await createAuthCookie();

    mockedFindStudent.mockResolvedValue({
      id: "student-1",
      guardianUserId: "guardian-1",
      name: "학생",
      schoolLevel: SchoolLevel.middle,
      grade: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    mockedFindMaterial.mockResolvedValue({
      id: "material-2",
      studentId: "student-2",
      title: "문제집",
      publisher: "출판사",
      subject: Subject.math,
      schoolLevel: SchoolLevel.middle,
      grade: 1,
      semester: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      student: {
        id: "student-2",
      },
    } as never);

    const request = new Request("http://localhost/api/v1/attempts", {
      method: "POST",
      headers: {
        cookie: authCookie,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        studentId: "student-1",
        materialId: "material-2",
        attemptDate: "2026-02-21",
      }),
    });

    const response = await POST(request);
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(mockedCreateAttempt).not.toHaveBeenCalled();
  });
});
