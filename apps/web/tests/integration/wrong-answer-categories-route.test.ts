import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@prisma/client";
import { signAuthToken } from "@/modules/auth/jwt";
import { AUTH_COOKIE_NAME } from "@/modules/auth/constants";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    wrongAnswer: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    wrongAnswerCategory: {
      findMany: vi.fn(),
    },
    wrongAnswerCategoryMap: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import { PUT } from "@/app/api/v1/wrong-answers/[id]/categories/route";

const mockedFindWrongAnswer = vi.mocked(prisma.wrongAnswer.findFirst);
const mockedFindCategories = vi.mocked(prisma.wrongAnswerCategory.findMany);
const mockedDeleteMany = vi.mocked(prisma.wrongAnswerCategoryMap.deleteMany);
const mockedCreateMany = vi.mocked(prisma.wrongAnswerCategoryMap.createMany);
const mockedFindUpdatedWrongAnswer = vi.mocked(prisma.wrongAnswer.findUnique);
const mockedTransaction = vi.mocked(prisma.$transaction);

const wrongAnswerOwnershipFixture = {
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
      attemptDate: new Date("2026-02-21T00:00:00.000Z"),
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      student: { id: "student-1", guardianUserId: "guardian-1" },
      material: { id: "material-1" },
    },
  },
  categories: [],
};

async function createAuthCookie() {
  const token = await signAuthToken({
    sub: "guardian-1",
    role: UserRole.guardian,
    email: "guardian@example.com",
  });

  return `${AUTH_COOKIE_NAME}=${token}`;
}

describe("PUT /api/v1/wrong-answers/[id]/categories", () => {
  beforeEach(() => {
    mockedFindWrongAnswer.mockReset();
    mockedFindCategories.mockReset();
    mockedDeleteMany.mockReset();
    mockedCreateMany.mockReset();
    mockedFindUpdatedWrongAnswer.mockReset();
    mockedTransaction.mockReset();

    mockedTransaction.mockImplementation(async (callback: unknown) => {
      if (typeof callback !== "function") {
        throw new TypeError("Callback transaction is required");
      }

      return (callback as (tx: unknown) => unknown)({
        wrongAnswerCategoryMap: {
          deleteMany: mockedDeleteMany,
          createMany: mockedCreateMany,
        },
        wrongAnswer: {
          findUnique: mockedFindUpdatedWrongAnswer,
        },
      });
    });
  });

  it("returns 403 when wrong-answer ownership verification fails", async () => {
    const authCookie = await createAuthCookie();
    mockedFindWrongAnswer.mockResolvedValue(null as never);

    const request = new Request("http://localhost/api/v1/wrong-answers/wa-1/categories", {
      method: "PUT",
      headers: {
        cookie: authCookie,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        categoryKeys: ["calculation_mistake"],
      }),
    });

    const response = await PUT(request, { params: Promise.resolve({ id: "wa-1" }) });
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("returns 400 when request includes unknown category keys", async () => {
    const authCookie = await createAuthCookie();

    mockedFindWrongAnswer.mockResolvedValue(wrongAnswerOwnershipFixture as never);

    mockedFindCategories.mockResolvedValue([
      {
        id: "cat-1",
        key: "calculation_mistake",
      },
    ] as never);

    const request = new Request("http://localhost/api/v1/wrong-answers/wa-1/categories", {
      method: "PUT",
      headers: {
        cookie: authCookie,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        categoryKeys: ["calculation_mistake", "unknown_key"],
      }),
    });

    const response = await PUT(request, { params: Promise.resolve({ id: "wa-1" }) });
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(mockedDeleteMany).not.toHaveBeenCalled();
    expect(mockedCreateMany).not.toHaveBeenCalled();
  });

  it("saves selected category keys and returns updated wrong-answer", async () => {
    const authCookie = await createAuthCookie();

    mockedFindWrongAnswer.mockResolvedValue(wrongAnswerOwnershipFixture as never);
    mockedFindCategories.mockResolvedValue([
      {
        id: "cat-1",
        key: "calculation_mistake",
      },
      {
        id: "cat-2",
        key: "misread_question",
      },
    ] as never);
    mockedFindUpdatedWrongAnswer.mockResolvedValue({
      ...wrongAnswerOwnershipFixture,
      categories: [
        {
          wrongAnswerId: "wa-1",
          categoryId: "cat-1",
          category: {
            id: "cat-1",
            key: "calculation_mistake",
            labelKo: "단순 연산 실수",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        {
          wrongAnswerId: "wa-1",
          categoryId: "cat-2",
          category: {
            id: "cat-2",
            key: "misread_question",
            labelKo: "문제 잘못 읽음",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ],
    } as never);

    const request = new Request("http://localhost/api/v1/wrong-answers/wa-1/categories", {
      method: "PUT",
      headers: {
        cookie: authCookie,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        categoryKeys: ["calculation_mistake", "misread_question"],
      }),
    });

    const response = await PUT(request, { params: Promise.resolve({ id: "wa-1" }) });
    const body = (await response.json()) as { categories: Array<{ key: string }> };

    expect(response.status).toBe(200);
    expect(mockedDeleteMany).toHaveBeenCalledWith({
      where: {
        wrongAnswerId: "wa-1",
      },
    });
    expect(mockedCreateMany).toHaveBeenCalledWith({
      data: [
        {
          wrongAnswerId: "wa-1",
          categoryId: "cat-1",
        },
        {
          wrongAnswerId: "wa-1",
          categoryId: "cat-2",
        },
      ],
    });
    expect(body.categories.map((category) => category.key)).toEqual(["calculation_mistake", "misread_question"]);
  });

  it("clears categories when empty array is provided", async () => {
    const authCookie = await createAuthCookie();

    mockedFindWrongAnswer.mockResolvedValue(wrongAnswerOwnershipFixture as never);
    mockedFindCategories.mockResolvedValue([] as never);
    mockedFindUpdatedWrongAnswer.mockResolvedValue({
      ...wrongAnswerOwnershipFixture,
      categories: [],
    } as never);

    const request = new Request("http://localhost/api/v1/wrong-answers/wa-1/categories", {
      method: "PUT",
      headers: {
        cookie: authCookie,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        categoryKeys: [],
      }),
    });

    const response = await PUT(request, { params: Promise.resolve({ id: "wa-1" }) });
    const body = (await response.json()) as { categories: Array<{ key: string }> };

    expect(response.status).toBe(200);
    expect(mockedDeleteMany).toHaveBeenCalledTimes(1);
    expect(mockedCreateMany).not.toHaveBeenCalled();
    expect(body.categories).toEqual([]);
  });
});
