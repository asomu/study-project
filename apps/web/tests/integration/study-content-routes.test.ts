import { beforeEach, describe, expect, it, vi } from "vitest";
import { PracticeProblemType, UserRole } from "@prisma/client";
import { AUTH_COOKIE_NAME } from "@/modules/auth/constants";
import { signAuthToken } from "@/modules/auth/jwt";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    curriculumNode: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    practiceSet: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    conceptLesson: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { GET as GET_STUDY_CONTENT } from "@/app/api/v1/study/content/route";
import { POST as POST_PRACTICE_SET } from "@/app/api/v1/study/content/practice-sets/route";
import { PUT as PUT_PRACTICE_SET } from "@/app/api/v1/study/content/practice-sets/[id]/route";
import { PUT as PUT_PRACTICE_SET_ACTIVATION } from "@/app/api/v1/study/content/practice-sets/[id]/activation/route";
import {
  DELETE as DELETE_CONCEPT,
  PUT as PUT_CONCEPT,
} from "@/app/api/v1/study/content/concepts/[curriculumNodeId]/route";

const mockedFindCurriculumNode = vi.mocked(prisma.curriculumNode.findFirst);
const mockedFindCurriculumNodes = vi.mocked(prisma.curriculumNode.findMany);
const mockedFindPracticeSets = vi.mocked(prisma.practiceSet.findMany);
const mockedFindPracticeSet = vi.mocked(prisma.practiceSet.findUnique);
const mockedUpdatePracticeSet = vi.mocked(prisma.practiceSet.update);
const mockedFindConceptLessons = vi.mocked(prisma.conceptLesson.findMany);
const mockedFindConceptLesson = vi.mocked(prisma.conceptLesson.findUnique);
const mockedDeleteConceptLesson = vi.mocked(prisma.conceptLesson.delete);

async function createAuthCookie(role: UserRole) {
  const token = await signAuthToken({
    sub: role === UserRole.student ? "student-user-1" : "guardian-1",
    role,
    email: role === UserRole.student ? undefined : "guardian@example.com",
    loginId: role === UserRole.student ? "student-login-1" : "guardian@example.com",
    name: role === UserRole.student ? "학생 1" : "보호자 1",
    studentId: role === UserRole.student ? "student-1" : undefined,
  });

  return `${AUTH_COOKIE_NAME}=${token}`;
}

describe("/api/v1/study/content*", () => {
  beforeEach(() => {
    mockedFindCurriculumNode.mockReset();
    mockedFindCurriculumNodes.mockReset();
    mockedFindPracticeSets.mockReset();
    mockedFindPracticeSet.mockReset();
    mockedUpdatePracticeSet.mockReset();
    mockedFindConceptLessons.mockReset();
    mockedFindConceptLesson.mockReset();
    mockedDeleteConceptLesson.mockReset();
  });

  it("allows admin to read study content", async () => {
    mockedFindCurriculumNode.mockResolvedValue({
      curriculumVersion: "2026.01",
    } as never);
    mockedFindCurriculumNodes.mockResolvedValue([
      {
        id: "node-1",
        curriculumVersion: "2026.01",
        unitCode: "M1-S1-U1",
        unitName: "소인수분해",
        sortOrder: 1,
      },
    ] as never);
    mockedFindPracticeSets.mockResolvedValue([] as never);
    mockedFindConceptLessons.mockResolvedValue([] as never);

    const authCookie = await createAuthCookie(UserRole.admin);
    const response = await GET_STUDY_CONTENT(
      new Request("http://localhost/api/v1/study/content?schoolLevel=middle&grade=1&semester=1", {
        headers: {
          cookie: authCookie,
        },
      }),
    );
    const body = (await response.json()) as { curriculumNodes: unknown[] };

    expect(response.status).toBe(200);
    expect(body.curriculumNodes).toHaveLength(1);
  });

  it("returns 403 when student reads study content", async () => {
    const authCookie = await createAuthCookie(UserRole.student);
    const response = await GET_STUDY_CONTENT(
      new Request("http://localhost/api/v1/study/content?schoolLevel=middle&grade=1&semester=1", {
        headers: {
          cookie: authCookie,
        },
      }),
    );
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("returns 400 for invalid single choice payload", async () => {
    const authCookie = await createAuthCookie(UserRole.guardian);
    const routeResponse = await POST_PRACTICE_SET(
      new Request("http://localhost/api/v1/study/content/practice-sets", {
        method: "POST",
        headers: {
          cookie: authCookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title: "새 세트",
          description: null,
          schoolLevel: "middle",
          grade: 1,
          semester: 1,
          curriculumNodeId: "node-1",
          sortOrder: 0,
          isActive: true,
          problems: [
            {
              problemNo: 1,
              type: PracticeProblemType.single_choice,
              prompt: "정답은?",
              choices: ["1"],
              correctAnswer: "2",
              explanation: null,
              skillTags: ["tag"],
              difficulty: 1,
            },
          ],
        }),
      }),
    );
    const body = (await routeResponse.json()) as { error: { code: string } };

    expect(routeResponse.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 409 when used practice set tries to edit problems", async () => {
    mockedFindPracticeSet.mockResolvedValue({
      id: "practice-set-1",
      schoolLevel: "middle",
      grade: 1,
      semester: 1,
      curriculumNodeId: "node-1",
      problems: [
        {
          problemNo: 1,
          type: PracticeProblemType.short_answer,
          prompt: "x = ?",
          choicesJson: null,
          correctAnswer: "2",
          explanation: null,
          skillTags: ["equation"],
          difficulty: 1,
        },
      ],
      _count: {
        attempts: 1,
      },
    } as never);

    const authCookie = await createAuthCookie(UserRole.guardian);
    const response = await PUT_PRACTICE_SET(
      new Request("http://localhost/api/v1/study/content/practice-sets/practice-set-1", {
        method: "PUT",
        headers: {
          cookie: authCookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title: "사용된 세트",
          description: null,
          schoolLevel: "middle",
          grade: 1,
          semester: 1,
          curriculumNodeId: "node-1",
          sortOrder: 1,
          isActive: true,
          problems: [
            {
              problemNo: 1,
              type: PracticeProblemType.short_answer,
              prompt: "x = ?",
              choices: null,
              correctAnswer: "3",
              explanation: null,
              skillTags: ["equation"],
              difficulty: 1,
            },
          ],
        }),
      }),
      {
        params: Promise.resolve({
          id: "practice-set-1",
        }),
      },
    );
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("CONFLICT");
  });

  it("returns 400 for invalid concept table payload", async () => {
    const authCookie = await createAuthCookie(UserRole.guardian);
    const response = await PUT_CONCEPT(
      new Request("http://localhost/api/v1/study/content/concepts/node-1", {
        method: "PUT",
        headers: {
          cookie: authCookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title: "개념",
          summary: null,
          content: {
            blocks: [
              {
                type: "table",
                rows: [["왼쪽", "오른쪽", "추가"]],
              },
            ],
          },
        }),
      }),
      {
        params: Promise.resolve({
          curriculumNodeId: "node-1",
        }),
      },
    );
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("toggles practice set activation", async () => {
    mockedFindPracticeSet.mockResolvedValue({
      id: "practice-set-1",
    } as never);
    mockedUpdatePracticeSet.mockResolvedValue({
      id: "practice-set-1",
      title: "세트",
      description: null,
      schoolLevel: "middle",
      grade: 1,
      semester: 1,
      curriculumNodeId: "node-1",
      sortOrder: 1,
      isActive: false,
      updatedAt: new Date(),
      curriculumNode: {
        unitName: "소인수분해",
      },
      problems: [],
      _count: {
        attempts: 0,
      },
    } as never);

    const authCookie = await createAuthCookie(UserRole.guardian);
    const response = await PUT_PRACTICE_SET_ACTIVATION(
      new Request("http://localhost/api/v1/study/content/practice-sets/practice-set-1/activation", {
        method: "PUT",
        headers: {
          cookie: authCookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          isActive: false,
        }),
      }),
      {
        params: Promise.resolve({
          id: "practice-set-1",
        }),
      },
    );
    const body = (await response.json()) as { practiceSet: { isActive: boolean } };

    expect(response.status).toBe(200);
    expect(body.practiceSet.isActive).toBe(false);
  });

  it("deletes concept lesson and returns 404 when missing", async () => {
    const authCookie = await createAuthCookie(UserRole.guardian);
    mockedFindConceptLesson.mockResolvedValueOnce(null as never);

    const missingResponse = await DELETE_CONCEPT(
      new Request("http://localhost/api/v1/study/content/concepts/node-missing", {
        method: "DELETE",
        headers: {
          cookie: authCookie,
        },
      }),
      {
        params: Promise.resolve({
          curriculumNodeId: "node-missing",
        }),
      },
    );

    expect(missingResponse.status).toBe(404);

    mockedFindConceptLesson.mockResolvedValueOnce({
      curriculumNodeId: "node-1",
    } as never);
    mockedDeleteConceptLesson.mockResolvedValueOnce({
      curriculumNodeId: "node-1",
    } as never);

    const deleteResponse = await DELETE_CONCEPT(
      new Request("http://localhost/api/v1/study/content/concepts/node-1", {
        method: "DELETE",
        headers: {
          cookie: authCookie,
        },
      }),
      {
        params: Promise.resolve({
          curriculumNodeId: "node-1",
        }),
      },
    );

    expect(deleteResponse.status).toBe(204);
  });
});
