import { beforeEach, describe, expect, it, vi } from "vitest";
import { SchoolLevel, UserRole } from "@prisma/client";
import { signAuthToken } from "@/modules/auth/jwt";
import { AUTH_COOKIE_NAME } from "@/modules/auth/constants";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    student: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/v1/students/route";

const mockedFindMany = vi.mocked(prisma.student.findMany);
const mockedFindFirst = vi.mocked(prisma.student.findFirst);
const mockedCreate = vi.mocked(prisma.student.create);

async function createAuthCookie() {
  const token = await signAuthToken({
    sub: "guardian-1",
    role: UserRole.guardian,
    email: "guardian@example.com",
  });

  return `${AUTH_COOKIE_NAME}=${token}`;
}

describe("/api/v1/students", () => {
  beforeEach(() => {
    mockedFindMany.mockReset();
    mockedFindFirst.mockReset();
    mockedCreate.mockReset();
  });

  it("returns 401 when authentication is missing", async () => {
    const request = new Request("http://localhost/api/v1/students", {
      method: "GET",
    });

    const response = await GET(request);
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("AUTH_REQUIRED");
  });

  it("returns owned students for authenticated guardian", async () => {
    const authCookie = await createAuthCookie();

    mockedFindMany.mockResolvedValue([
      {
        id: "student-1",
        guardianUserId: "guardian-1",
        name: "학생 1",
        schoolLevel: SchoolLevel.middle,
        grade: 1,
      },
    ] as never);

    const request = new Request("http://localhost/api/v1/students", {
      method: "GET",
      headers: { cookie: authCookie },
    });

    const response = await GET(request);
    const body = (await response.json()) as { students: Array<{ id: string }> };

    expect(response.status).toBe(200);
    expect(body.students).toHaveLength(1);
    expect(body.students[0]?.id).toBe("student-1");
  });

  it("returns 403 for not-owned student query", async () => {
    const authCookie = await createAuthCookie();

    mockedFindFirst.mockResolvedValue(null as never);

    const request = new Request("http://localhost/api/v1/students?studentId=student-2", {
      method: "GET",
      headers: { cookie: authCookie },
    });

    const response = await GET(request);
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("creates student with authenticated guardian ownership", async () => {
    const authCookie = await createAuthCookie();

    mockedCreate.mockResolvedValue({
      id: "student-new",
      guardianUserId: "guardian-1",
      name: "신규 학생",
      schoolLevel: SchoolLevel.middle,
      grade: 2,
    } as never);

    const request = new Request("http://localhost/api/v1/students", {
      method: "POST",
      headers: {
        cookie: authCookie,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "신규 학생",
        schoolLevel: SchoolLevel.middle,
        grade: 2,
      }),
    });

    const response = await POST(request);
    const body = (await response.json()) as { id: string };

    expect(response.status).toBe(201);
    expect(body.id).toBe("student-new");
  });
});
