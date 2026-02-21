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
      create: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/v1/materials/route";

const mockedFindFirst = vi.mocked(prisma.student.findFirst);
const mockedCreate = vi.mocked(prisma.material.create);

async function createAuthCookie() {
  const token = await signAuthToken({
    sub: "guardian-1",
    role: UserRole.guardian,
    email: "guardian@example.com",
  });

  return `${AUTH_COOKIE_NAME}=${token}`;
}

describe("POST /api/v1/materials", () => {
  beforeEach(() => {
    mockedFindFirst.mockReset();
    mockedCreate.mockReset();
  });

  it("returns 401 when authentication is missing", async () => {
    const request = new Request("http://localhost/api/v1/materials", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        studentId: "student-1",
        title: "문제집",
        publisher: "출판사",
        subject: Subject.math,
        grade: 1,
        semester: 1,
      }),
    });

    const response = await POST(request);
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("AUTH_REQUIRED");
  });

  it("returns 403 when student is not owned", async () => {
    const authCookie = await createAuthCookie();
    mockedFindFirst.mockResolvedValue(null as never);

    const request = new Request("http://localhost/api/v1/materials", {
      method: "POST",
      headers: {
        cookie: authCookie,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        studentId: "student-2",
        title: "문제집",
        publisher: "출판사",
        subject: Subject.math,
        grade: 1,
        semester: 1,
      }),
    });

    const response = await POST(request);
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("creates material for owned student", async () => {
    const authCookie = await createAuthCookie();

    mockedFindFirst.mockResolvedValue({
      id: "student-1",
      guardianUserId: "guardian-1",
      name: "학생",
      schoolLevel: SchoolLevel.middle,
      grade: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    mockedCreate.mockResolvedValue({
      id: "material-1",
      studentId: "student-1",
      title: "문제집",
      publisher: "출판사",
      subject: Subject.math,
      schoolLevel: SchoolLevel.middle,
      grade: 1,
      semester: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const request = new Request("http://localhost/api/v1/materials", {
      method: "POST",
      headers: {
        cookie: authCookie,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        studentId: "student-1",
        title: "문제집",
        publisher: "출판사",
        subject: Subject.math,
        grade: 1,
        semester: 1,
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subject: Subject.math,
        }),
      }),
    );
  });
});
