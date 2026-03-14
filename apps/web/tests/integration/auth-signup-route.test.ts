import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@prisma/client";
import { AUTH_COOKIE_NAME } from "@/modules/auth/constants";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userCredentialIdentifier: {
      findUnique: vi.fn(),
    },
    user: {
      create: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/v1/auth/signup/route";

const mockedFindCredentialIdentifier = vi.mocked(prisma.userCredentialIdentifier.findUnique);
const mockedCreate = vi.mocked(prisma.user.create);

describe("POST /api/v1/auth/signup", () => {
  beforeEach(() => {
    mockedFindCredentialIdentifier.mockReset();
    mockedCreate.mockReset();
  });

  it("creates guardian account, signs session, and returns 201", async () => {
    mockedFindCredentialIdentifier.mockResolvedValue(null as never);
    mockedCreate.mockResolvedValue({
      id: "guardian-new",
      role: UserRole.guardian,
      email: "new-guardian@example.com",
      loginId: "new-guardian@example.com",
      name: "새 보호자",
      isActive: true,
      passwordHash: "hashed",
      acceptedTermsAt: new Date(),
      lastLoginAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const request = new Request("http://localhost/api/v1/auth/signup", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "새 보호자",
        email: "new-guardian@example.com",
        password: "Guardian123!",
        confirmPassword: "Guardian123!",
        acceptedTerms: true,
      }),
    });

    const response = await POST(request);
    const body = (await response.json()) as { user: { id: string; loginId: string } };

    expect(response.status).toBe(201);
    expect(body.user.id).toBe("guardian-new");
    expect(body.user.loginId).toBe("new-guardian@example.com");
    expect(response.headers.get("set-cookie")).toContain(`${AUTH_COOKIE_NAME}=`);
  });

  it("returns 400 when terms are not accepted", async () => {
    const request = new Request("http://localhost/api/v1/auth/signup", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "새 보호자",
        email: "new-guardian@example.com",
        password: "Guardian123!",
        confirmPassword: "Guardian123!",
        acceptedTerms: false,
      }),
    });

    const response = await POST(request);
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 409 when email conflicts with another account loginId", async () => {
    mockedFindCredentialIdentifier.mockResolvedValueOnce({
      value: "new-guardian@example.com",
      userId: "student-user-1",
      createdAt: new Date(),
      user: {
        id: "student-user-1",
        role: UserRole.student,
        email: null,
        loginId: "new-guardian@example.com",
        name: "학생 1",
        isActive: true,
        passwordHash: "hashed",
        acceptedTermsAt: new Date(),
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    } as never);

    const request = new Request("http://localhost/api/v1/auth/signup", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "새 보호자",
        email: "new-guardian@example.com",
        password: "Guardian123!",
        confirmPassword: "Guardian123!",
        acceptedTerms: true,
      }),
    });

    const response = await POST(request);
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("CONFLICT");
    expect(mockedCreate).not.toHaveBeenCalled();
  });
});
