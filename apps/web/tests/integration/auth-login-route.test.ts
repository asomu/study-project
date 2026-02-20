import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@prisma/client";
import { AUTH_COOKIE_NAME } from "@/modules/auth/constants";
import { hashPassword } from "@/modules/auth/password";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/v1/auth/login/route";

const mockedFindUnique = vi.mocked(prisma.user.findUnique);

describe("POST /api/v1/auth/login", () => {
  beforeEach(() => {
    mockedFindUnique.mockReset();
  });

  it("returns 200 and sets auth cookie on valid credentials", async () => {
    const passwordHash = await hashPassword("Guardian123!");

    mockedFindUnique.mockResolvedValue({
      id: "guardian-1",
      email: "guardian@example.com",
      passwordHash,
      role: UserRole.guardian,
    } as never);

    const request = new Request("http://localhost/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "guardian@example.com",
        password: "Guardian123!",
      }),
    });

    const response = await POST(request);
    const body = (await response.json()) as { accessToken: string; user: { id: string } };

    expect(response.status).toBe(200);
    expect(body.accessToken).toBeTruthy();
    expect(body.user.id).toBe("guardian-1");
    expect(response.headers.get("set-cookie")).toContain(`${AUTH_COOKIE_NAME}=`);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("returns 401 on invalid credentials", async () => {
    const passwordHash = await hashPassword("DifferentPassword123!");

    mockedFindUnique.mockResolvedValue({
      id: "guardian-1",
      email: "guardian@example.com",
      passwordHash,
      role: UserRole.guardian,
    } as never);

    const request = new Request("http://localhost/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "guardian@example.com",
        password: "WrongPassword123!",
      }),
    });

    const response = await POST(request);
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("AUTH_INVALID_CREDENTIALS");
  });
});
