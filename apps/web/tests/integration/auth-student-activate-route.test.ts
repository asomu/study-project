import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@prisma/client";
import { AUTH_COOKIE_NAME } from "@/modules/auth/constants";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/v1/auth/student-activate/route";

const mockedTransaction = vi.mocked(prisma.$transaction);

describe("POST /api/v1/auth/student-activate", () => {
  beforeEach(() => {
    mockedTransaction.mockReset();
  });

  it("activates student account and signs session", async () => {
    const now = new Date("2030-03-07T00:00:00.000Z");

    mockedTransaction.mockImplementation(async (callback: unknown) => {
      if (typeof callback !== "function") {
        throw new TypeError("Callback transaction is required");
      }

      return (callback as (tx: unknown) => unknown)({
        studentInvite: {
          findUnique: vi.fn().mockResolvedValue({
            id: "invite-1",
            studentId: "student-1",
            codeHash: "hash",
            expiresAt: new Date("2030-03-14T00:00:00.000Z"),
            usedAt: null,
            student: {
              id: "student-1",
              loginUserId: null,
            },
          }),
          update: vi.fn().mockResolvedValue({}),
        },
        userCredentialIdentifier: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
        user: {
          create: vi.fn().mockResolvedValue({
            id: "student-user-1",
            role: UserRole.student,
            email: null,
            loginId: "student-math",
            name: "학생 1",
            isActive: true,
            passwordHash: "hashed",
            acceptedTermsAt: now,
            lastLoginAt: now,
            createdAt: now,
            updatedAt: now,
          }),
        },
        student: {
          update: vi.fn().mockResolvedValue({}),
        },
      });
    });

    const request = new Request("http://localhost/api/v1/auth/student-activate", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        inviteCode: "ABCD-EFGH-IJKL",
        loginId: "student-math",
        password: "Student123!",
        displayName: "학생 1",
      }),
    });

    const response = (await POST(request))!;
    const body = (await response.json()) as { user: { role: UserRole; studentId?: string } };

    expect(response.status).toBe(201);
    expect(body.user.role).toBe(UserRole.student);
    expect(body.user.studentId).toBe("student-1");
    expect(response.headers.get("set-cookie")).toContain(`${AUTH_COOKIE_NAME}=`);
  });

  it("returns 409 when invite was already used", async () => {
    mockedTransaction.mockImplementation(async (callback: unknown) => {
      if (typeof callback !== "function") {
        throw new TypeError("Callback transaction is required");
      }

      return (callback as (tx: unknown) => unknown)({
        studentInvite: {
          findUnique: vi.fn().mockResolvedValue({
            id: "invite-1",
            studentId: "student-1",
            codeHash: "hash",
            expiresAt: new Date("2030-03-14T00:00:00.000Z"),
            usedAt: new Date("2030-03-07T00:00:00.000Z"),
            student: {
              id: "student-1",
              loginUserId: null,
            },
          }),
        },
      });
    });

    const request = new Request("http://localhost/api/v1/auth/student-activate", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        inviteCode: "ABCD-EFGH-IJKL",
        loginId: "student-math",
        password: "Student123!",
        displayName: "학생 1",
      }),
    });

    const response = (await POST(request))!;
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("CONFLICT");
  });

  it("returns 409 when requested loginId conflicts with another account email", async () => {
    mockedTransaction.mockImplementation(async (callback: unknown) => {
      if (typeof callback !== "function") {
        throw new TypeError("Callback transaction is required");
      }

      return (callback as (tx: unknown) => unknown)({
        studentInvite: {
          findUnique: vi.fn().mockResolvedValue({
            id: "invite-1",
            studentId: "student-1",
            codeHash: "hash",
            expiresAt: new Date("2030-03-14T00:00:00.000Z"),
            usedAt: null,
            student: {
              id: "student-1",
              loginUserId: null,
            },
          }),
        },
        userCredentialIdentifier: {
          findUnique: vi.fn().mockResolvedValue({
            value: "student-math",
            userId: "guardian-1",
            createdAt: new Date(),
            user: {
              id: "guardian-1",
              role: UserRole.guardian,
              email: "student-math",
              loginId: "guardian@example.com",
              name: "기본 보호자",
              isActive: true,
              passwordHash: "hashed",
              acceptedTermsAt: new Date(),
              lastLoginAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          }),
        },
      });
    });

    const request = new Request("http://localhost/api/v1/auth/student-activate", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        inviteCode: "ABCD-EFGH-IJKL",
        loginId: "student-math",
        password: "Student123!",
        displayName: "학생 1",
      }),
    });

    const response = (await POST(request))!;
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("CONFLICT");
  });
});
