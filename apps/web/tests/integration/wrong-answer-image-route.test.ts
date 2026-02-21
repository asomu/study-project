import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@prisma/client";
import { signAuthToken } from "@/modules/auth/jwt";
import { AUTH_COOKIE_NAME } from "@/modules/auth/constants";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    wrongAnswer: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/v1/wrong-answers/[id]/image/route";

const mockedFindWrongAnswer = vi.mocked(prisma.wrongAnswer.findFirst);

async function createAuthCookie() {
  const token = await signAuthToken({
    sub: "guardian-1",
    role: UserRole.guardian,
    email: "guardian@example.com",
  });

  return `${AUTH_COOKIE_NAME}=${token}`;
}

describe("POST /api/v1/wrong-answers/[id]/image", () => {
  beforeEach(() => {
    mockedFindWrongAnswer.mockReset();
    mockedFindWrongAnswer.mockResolvedValue({
      id: "wa-1",
      attemptItemId: "attempt-item-1",
      imagePath: null,
      memo: null,
      reviewedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      attemptItem: {
        id: "attempt-item-1",
        attemptId: "attempt-1",
        curriculumNodeId: "node-1",
        problemNo: 1,
        isCorrect: false,
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
      },
      categories: [],
    } as never);
  });

  it("returns 415 for unsupported mime types", async () => {
    const authCookie = await createAuthCookie();
    const formData = new FormData();

    formData.set("file", new File(["hello"], "note.txt", { type: "text/plain" }));

    const request = new Request("http://localhost/api/v1/wrong-answers/wa-1/image", {
      method: "POST",
      headers: {
        cookie: authCookie,
      },
      body: formData,
    });

    const response = await POST(request, { params: Promise.resolve({ id: "wa-1" }) });
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(415);
    expect(body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
  });

  it("returns 413 for files larger than configured limit", async () => {
    const authCookie = await createAuthCookie();
    const formData = new FormData();
    const oversized = "a".repeat(5 * 1024 * 1024 + 1);

    formData.set("file", new File([oversized], "oversized.png", { type: "image/png" }));

    const request = new Request("http://localhost/api/v1/wrong-answers/wa-1/image", {
      method: "POST",
      headers: {
        cookie: authCookie,
      },
      body: formData,
    });

    const response = await POST(request, { params: Promise.resolve({ id: "wa-1" }) });
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(413);
    expect(body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });
});
