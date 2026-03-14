import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@prisma/client";

vi.mock("@/modules/auth/session", () => ({
  getAuthSessionFromRequest: vi.fn(),
}));

vi.mock("@/modules/students/invite-service", () => ({
  resetStudentInvite: vi.fn(),
}));

import { POST } from "@/app/api/v1/students/[id]/invite/reset/route";
import { getAuthSessionFromRequest } from "@/modules/auth/session";
import { resetStudentInvite } from "@/modules/students/invite-service";

const mockedGetAuthSessionFromRequest = vi.mocked(getAuthSessionFromRequest);
const mockedResetStudentInvite = vi.mocked(resetStudentInvite);

describe("POST /api/v1/students/[id]/invite/reset", () => {
  beforeEach(() => {
    mockedGetAuthSessionFromRequest.mockReset();
    mockedResetStudentInvite.mockReset();
  });

  it("returns 401 when authentication is missing", async () => {
    mockedGetAuthSessionFromRequest.mockResolvedValue(null);

    const response = await POST(new Request("http://localhost/api/v1/students/student-1/invite/reset", { method: "POST" }), {
      params: Promise.resolve({ id: "student-1" }),
    });
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("AUTH_REQUIRED");
  });

  it("returns 403 when student role requests invite reset", async () => {
    mockedGetAuthSessionFromRequest.mockResolvedValue({
      userId: "student-user-1",
      role: UserRole.student,
      loginId: "student-math",
      name: "학생 1",
      studentId: "student-1",
    });

    const response = await POST(new Request("http://localhost/api/v1/students/student-1/invite/reset", { method: "POST" }), {
      params: Promise.resolve({ id: "student-1" }),
    });
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("resets the linked student account and returns a new invite", async () => {
    mockedGetAuthSessionFromRequest.mockResolvedValue({
      userId: "guardian-1",
      role: UserRole.guardian,
      email: "guardian@example.com",
      loginId: "guardian@example.com",
      name: "기본 보호자",
    });
    mockedResetStudentInvite.mockResolvedValue({
      student: {
        id: "student-1",
        name: "학생 1",
      },
      inviteCode: "ABCD-EFGH-IJKL",
      expiresAt: new Date("2026-03-14T00:00:00.000Z"),
    } as never);

    const response = await POST(new Request("http://localhost/api/v1/students/student-1/invite/reset", { method: "POST" }), {
      params: Promise.resolve({ id: "student-1" }),
    });
    const body = (await response.json()) as { studentId: string; inviteCode: string };

    expect(response.status).toBe(200);
    expect(body.studentId).toBe("student-1");
    expect(body.inviteCode).toBe("ABCD-EFGH-IJKL");
    expect(mockedResetStudentInvite).toHaveBeenCalledWith({
      studentId: "student-1",
      guardianUserId: "guardian-1",
    });
  });
});
