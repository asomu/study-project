import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@prisma/client";
import { signAuthToken } from "@/modules/auth/jwt";
import { AUTH_COOKIE_NAME } from "@/modules/auth/constants";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    attempt: {
      findFirst: vi.fn(),
    },
    attemptItem: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    curriculumNode: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(async (operations: Array<Promise<unknown>>) => Promise.all(operations)),
  },
}));

import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/v1/attempts/[attemptId]/items/route";

const mockedFindAttempt = vi.mocked(prisma.attempt.findFirst);

async function createAuthCookie() {
  const token = await signAuthToken({
    sub: "guardian-1",
    role: UserRole.guardian,
    email: "guardian@example.com",
  });

  return `${AUTH_COOKIE_NAME}=${token}`;
}

describe("POST /api/v1/attempts/[attemptId]/items", () => {
  beforeEach(() => {
    mockedFindAttempt.mockReset();
  });

  it("returns 400 when payload has duplicate problemNo", async () => {
    const authCookie = await createAuthCookie();

    const request = new Request("http://localhost/api/v1/attempts/attempt-1/items", {
      method: "POST",
      headers: {
        cookie: authCookie,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            curriculumNodeId: "node-1",
            problemNo: 1,
            isCorrect: false,
          },
          {
            curriculumNodeId: "node-2",
            problemNo: 1,
            isCorrect: true,
          },
        ],
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ attemptId: "attempt-1" }) });
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 403 when attempt ownership verification fails", async () => {
    const authCookie = await createAuthCookie();
    mockedFindAttempt.mockResolvedValue(null as never);

    const request = new Request("http://localhost/api/v1/attempts/attempt-2/items", {
      method: "POST",
      headers: {
        cookie: authCookie,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            curriculumNodeId: "node-1",
            problemNo: 1,
            isCorrect: false,
          },
        ],
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ attemptId: "attempt-2" }) });
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });
});
