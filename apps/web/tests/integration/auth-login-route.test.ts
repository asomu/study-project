import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@prisma/client";
import { AUTH_COOKIE_NAME } from "@/modules/auth/constants";
import { hashPassword } from "@/modules/auth/password";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userCredentialIdentifier: {
      findUnique: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
    student: {
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/v1/auth/login/route";

const mockedFindCredentialIdentifier = vi.mocked(prisma.userCredentialIdentifier.findUnique);
const mockedUpdate = vi.mocked(prisma.user.update);

describe("POST /api/v1/auth/login", () => {
  beforeEach(() => {
    mockedFindCredentialIdentifier.mockReset();
    mockedUpdate.mockReset();
  });

  it("returns 200 and sets auth cookie on valid credentials", async () => {
    const passwordHash = await hashPassword("Guardian123!");

    mockedFindCredentialIdentifier.mockResolvedValueOnce({
      value: "guardian@example.com",
      userId: "guardian-1",
      createdAt: new Date(),
      user: {
        id: "guardian-1",
        email: "guardian@example.com",
        loginId: "guardian@example.com",
        name: "기본 보호자",
        isActive: true,
        passwordHash,
        role: UserRole.guardian,
      },
    } as never);
    mockedUpdate.mockResolvedValue({} as never);

    const request = new Request("http://localhost/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        identifier: "guardian@example.com",
        password: "Guardian123!",
      }),
    });

    const response = await POST(request);
    const body = (await response.json()) as { accessToken: string; user: { id: string; loginId: string } };

    expect(response.status).toBe(200);
    expect(body.accessToken).toBeTruthy();
    expect(body.user.id).toBe("guardian-1");
    expect(body.user.loginId).toBe("guardian@example.com");
    expect(response.headers.get("set-cookie")).toContain(`${AUTH_COOKIE_NAME}=`);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("returns 401 on invalid credentials", async () => {
    const passwordHash = await hashPassword("DifferentPassword123!");

    mockedFindCredentialIdentifier.mockResolvedValueOnce({
      value: "guardian@example.com",
      userId: "guardian-1",
      createdAt: new Date(),
      user: {
        id: "guardian-1",
        email: "guardian@example.com",
        loginId: "guardian@example.com",
        name: "기본 보호자",
        isActive: true,
        passwordHash,
        role: UserRole.guardian,
      },
    } as never);

    const request = new Request("http://localhost/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        identifier: "guardian@example.com",
        password: "WrongPassword123!",
      }),
    });

    const response = await POST(request);
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("AUTH_INVALID_CREDENTIALS");
  });

  it("returns 403 when account is inactive", async () => {
    const passwordHash = await hashPassword("Guardian123!");

    mockedFindCredentialIdentifier.mockResolvedValueOnce({
      value: "guardian@example.com",
      userId: "guardian-1",
      createdAt: new Date(),
      user: {
        id: "guardian-1",
        email: "guardian@example.com",
        loginId: "guardian@example.com",
        name: "기본 보호자",
        isActive: false,
        passwordHash,
        role: UserRole.guardian,
      },
    } as never);

    const request = new Request("http://localhost/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        identifier: "guardian@example.com",
        password: "Guardian123!",
      }),
    });

    const response = await POST(request);
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("AUTH_ACCOUNT_INACTIVE");
  });

  it("supports the legacy email field for guardian login", async () => {
    const passwordHash = await hashPassword("Guardian123!");

    mockedFindCredentialIdentifier.mockResolvedValueOnce({
      value: "guardian@example.com",
      userId: "guardian-1",
      createdAt: new Date(),
      user: {
        id: "guardian-1",
        email: "guardian@example.com",
        loginId: "guardian@example.com",
        name: "기본 보호자",
        isActive: true,
        passwordHash,
        role: UserRole.guardian,
      },
    } as never);
    mockedUpdate.mockResolvedValue({} as never);

    const request = new Request("http://localhost/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "guardian@example.com",
        password: "Guardian123!",
      }),
    });

    const response = await POST(request);
    const body = (await response.json()) as { user: { loginId: string } };

    expect(response.status).toBe(200);
    expect(body.user.loginId).toBe("guardian@example.com");
  });
});
