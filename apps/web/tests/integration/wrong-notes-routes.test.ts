import { Buffer } from "node:buffer";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole, WrongNoteReason } from "@prisma/client";
import { AUTH_COOKIE_NAME } from "@/modules/auth/constants";
import { signAuthToken } from "@/modules/auth/jwt";
import { saveWrongNoteImage } from "@/modules/shared/wrong-note-storage";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    student: {
      findFirst: vi.fn(),
    },
    curriculumNode: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    wrongNote: {
      count: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { GET as GET_STUDENT_WRONG_NOTE_DASHBOARD } from "@/app/api/v1/student/wrong-notes/dashboard/route";
import { GET as GET_STUDENT_WRONG_NOTE_CHART } from "@/app/api/v1/student/wrong-notes/chart/route";
import { GET as GET_STUDENT_WRONG_NOTE_IMAGE } from "@/app/api/v1/student/wrong-notes/[id]/image/route";
import { GET as GET_STUDENT_WRONG_NOTES, POST as POST_STUDENT_WRONG_NOTES } from "@/app/api/v1/student/wrong-notes/route";
import { PUT as PUT_GUARDIAN_WRONG_NOTE_FEEDBACK } from "@/app/api/v1/wrong-notes/[id]/feedback/route";
import { GET as GET_GUARDIAN_WRONG_NOTE_CHART } from "@/app/api/v1/wrong-notes/chart/route";
import { GET as GET_GUARDIAN_WRONG_NOTE_IMAGE } from "@/app/api/v1/wrong-notes/[id]/image/route";
import { GET as GET_GUARDIAN_WRONG_NOTES } from "@/app/api/v1/wrong-notes/route";

const mockedFindStudent = vi.mocked(prisma.student.findFirst);
const mockedFindCurriculumNode = vi.mocked(prisma.curriculumNode.findFirst);
const mockedFindCurriculumNodes = vi.mocked(prisma.curriculumNode.findMany);
const mockedWrongNoteCount = vi.mocked(prisma.wrongNote.count);
const mockedWrongNoteFindMany = vi.mocked(prisma.wrongNote.findMany);
const mockedWrongNoteCreate = vi.mocked(prisma.wrongNote.create);
const mockedWrongNoteFindFirst = vi.mocked(prisma.wrongNote.findFirst);
const mockedWrongNoteUpdate = vi.mocked(prisma.wrongNote.update);
const mockedWrongNoteGroupBy = vi.mocked(prisma.wrongNote.groupBy);
const wrongNoteRouteTestDataRoot = resolve(process.cwd(), ".tmp/test-route-data");

const linkedStudent = {
  id: "student-1",
  guardianUserId: "guardian-1",
  loginUserId: "student-user-1",
  name: "학생 1",
  schoolLevel: "middle",
  grade: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const wrongNoteRecord = {
  id: "note-1",
  studentId: "student-1",
  curriculumNodeId: "node-1",
  reason: WrongNoteReason.calculation_mistake,
  imagePath: "student-1/note-1/seed.png",
  studentMemo: "부호를 반대로 봤어요.",
  guardianFeedback: "부호를 먼저 보고 계산하자.",
  guardianFeedbackByUserId: "guardian-1",
  guardianFeedbackAt: new Date("2026-03-21T10:00:00.000Z"),
  deletedAt: null,
  createdAt: new Date("2026-03-21T09:00:00.000Z"),
  updatedAt: new Date("2026-03-21T10:00:00.000Z"),
  student: {
    id: "student-1",
    name: "학생 1",
    schoolLevel: "middle",
    grade: 1,
  },
  curriculumNode: {
    id: "node-1",
    unitName: "유리수와 순환소수",
    grade: 2,
    semester: 1,
  },
};

async function createAuthCookie(role: UserRole) {
  const token = await signAuthToken(
    role === UserRole.student
      ? {
          sub: "student-user-1",
          role,
          loginId: "student-1",
          name: "학생 1",
          studentId: "student-1",
        }
      : {
          sub: "guardian-1",
          role,
          loginId: "guardian@example.com",
          email: "guardian@example.com",
          name: "기본 보호자",
        },
  );

  return `${AUTH_COOKIE_NAME}=${token}`;
}

describe("wrong-note routes", () => {
  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(wrongNoteRouteTestDataRoot, {
      recursive: true,
      force: true,
    });
  });

  beforeEach(() => {
    mockedFindStudent.mockReset();
    mockedFindCurriculumNode.mockReset();
    mockedFindCurriculumNodes.mockReset();
    mockedWrongNoteCount.mockReset();
    mockedWrongNoteFindMany.mockReset();
    mockedWrongNoteCreate.mockReset();
    mockedWrongNoteFindFirst.mockReset();
    mockedWrongNoteUpdate.mockReset();
    mockedWrongNoteGroupBy.mockReset();
  });

  it("creates a student wrong-note with a valid image upload", async () => {
    vi.stubEnv("APP_DATA_ROOT", ".tmp/test-route-data");

    const authCookie = await createAuthCookie(UserRole.student);

    mockedFindStudent.mockResolvedValue(linkedStudent as never);
    mockedFindCurriculumNode.mockResolvedValue({
      id: "node-1",
      schoolLevel: "middle",
      subject: "math",
      grade: 2,
      semester: 1,
      unitName: "유리수와 순환소수",
    } as never);
    mockedWrongNoteCreate.mockResolvedValue(wrongNoteRecord as never);

    const formData = new FormData();
    formData.set(
      "file",
      new File([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])], "note.png", {
        type: "image/png",
      }),
    );
    formData.set("grade", "2");
    formData.set("semester", "1");
    formData.set("curriculumNodeId", "node-1");
    formData.set("reason", "calculation_mistake");
    formData.set("studentMemo", "부호를 반대로 봤어요.");

    const request = new Request("http://localhost/api/v1/student/wrong-notes", {
      method: "POST",
      headers: {
        cookie: authCookie,
      },
      body: formData,
    });

    const response = await POST_STUDENT_WRONG_NOTES(request);
    const body = (await response.json()) as {
      id: string;
      imagePath: string;
      reason: { key: string };
      curriculum: { unitName: string };
    };

    expect(response.status).toBe(201);
    expect(body.id).toBe("note-1");
    expect(body.imagePath).toBe("/api/v1/student/wrong-notes/note-1/image");
    expect(body.reason.key).toBe("calculation_mistake");
    expect(body.curriculum.unitName).toBe("유리수와 순환소수");
    expect(mockedFindCurriculumNode).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          schoolLevel: "middle",
          grade: 2,
          semester: 1,
        }),
      }),
    );
  });

  it("rejects invalid date ranges for student wrong-note list", async () => {
    const authCookie = await createAuthCookie(UserRole.student);
    const request = new Request("http://localhost/api/v1/student/wrong-notes?from=2026-03-22&to=2026-03-21", {
      method: "GET",
      headers: {
        cookie: authCookie,
      },
    });

    const response = await GET_STUDENT_WRONG_NOTES(request);
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("builds student wrong-note dashboard summary", async () => {
    const authCookie = await createAuthCookie(UserRole.student);

    mockedFindStudent.mockResolvedValue(linkedStudent as never);
    mockedWrongNoteCount.mockResolvedValueOnce(4 as never).mockResolvedValueOnce(2 as never).mockResolvedValueOnce(1 as never);
    mockedWrongNoteGroupBy.mockResolvedValue([
      {
        reason: WrongNoteReason.calculation_mistake,
        _count: {
          _all: 3,
        },
      },
      {
        reason: WrongNoteReason.misread_question,
        _count: {
          _all: 1,
        },
      },
    ] as never);
    mockedWrongNoteFindMany.mockResolvedValue([
      {
        curriculumNodeId: "node-1",
        curriculumNode: {
          unitName: "정수와 유리수",
        },
      },
      {
        curriculumNodeId: "node-1",
        curriculumNode: {
          unitName: "정수와 유리수",
        },
      },
      {
        curriculumNodeId: "node-2",
        curriculumNode: {
          unitName: "소인수분해",
        },
      },
    ] as never);

    const request = new Request("http://localhost/api/v1/student/wrong-notes/dashboard", {
      method: "GET",
      headers: {
        cookie: authCookie,
      },
    });

    const response = await GET_STUDENT_WRONG_NOTE_DASHBOARD(request);
    const body = (await response.json()) as {
      summary: {
        totalNotes: number;
        reasonCounts: Record<string, number>;
      };
      topUnits: Array<{ unitName: string; count: number }>;
    };

    expect(response.status).toBe(200);
    expect(body.summary.totalNotes).toBe(4);
    expect(body.summary.reasonCounts.calculation_mistake).toBe(3);
    expect(body.topUnits[0]).toEqual({
      unitName: "정수와 유리수",
      curriculumNodeId: "node-1",
      count: 2,
    });
  });

  it("builds a student unit chart with zero-count curriculum bars", async () => {
    const authCookie = await createAuthCookie(UserRole.student);

    mockedFindStudent.mockResolvedValue(linkedStudent as never);
    mockedFindCurriculumNodes.mockResolvedValue([
      {
        id: "node-1",
        unitName: "소인수분해",
        unitCode: "M2-S1-U1",
        sortOrder: 1,
      },
      {
        id: "node-2",
        unitName: "유리수와 순환소수",
        unitCode: "M2-S1-U2",
        sortOrder: 2,
      },
    ] as never);
    mockedWrongNoteFindMany.mockResolvedValue([
      {
        curriculumNodeId: "node-2",
      },
      {
        curriculumNodeId: "node-2",
      },
    ] as never);

    const request = new Request("http://localhost/api/v1/student/wrong-notes/chart?dimension=unit&grade=2&semester=1", {
      method: "GET",
      headers: {
        cookie: authCookie,
      },
    });

    const response = await GET_STUDENT_WRONG_NOTE_CHART(request);
    const body = (await response.json()) as {
      chart: {
        dimension: string;
        totalCount: number;
        bars: Array<{ key: string; value: number }>;
      };
    };

    expect(response.status).toBe(200);
    expect(body.chart.dimension).toBe("unit");
    expect(body.chart.totalCount).toBe(2);
    expect(body.chart.bars.map((bar) => ({ key: bar.key, value: bar.value }))).toEqual([
      {
        key: "node-1",
        value: 0,
      },
      {
        key: "node-2",
        value: 2,
      },
    ]);
  });

  it("rejects invalid chart grade requests outside the student's school level", async () => {
    const authCookie = await createAuthCookie(UserRole.student);

    mockedFindStudent.mockResolvedValue(linkedStudent as never);

    const request = new Request("http://localhost/api/v1/student/wrong-notes/chart?dimension=reason&grade=4&semester=1", {
      method: "GET",
      headers: {
        cookie: authCookie,
      },
    });

    const response = await GET_STUDENT_WRONG_NOTE_CHART(request);
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 403 when a student accesses guardian wrong-note list", async () => {
    const authCookie = await createAuthCookie(UserRole.student);
    const request = new Request("http://localhost/api/v1/wrong-notes?studentId=student-1", {
      method: "GET",
      headers: {
        cookie: authCookie,
      },
    });

    const response = await GET_GUARDIAN_WRONG_NOTES(request);
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("stores guardian feedback for an owned wrong-note", async () => {
    const authCookie = await createAuthCookie(UserRole.guardian);

    mockedWrongNoteFindFirst.mockResolvedValue({
      id: "note-1",
    } as never);
    mockedWrongNoteUpdate.mockResolvedValue({
      ...wrongNoteRecord,
      guardianFeedback: "부호를 먼저 확인해 보자.",
      guardianFeedbackAt: new Date("2026-03-21T11:00:00.000Z"),
    } as never);

    const request = new Request("http://localhost/api/v1/wrong-notes/note-1/feedback", {
      method: "PUT",
      headers: {
        cookie: authCookie,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        text: "부호를 먼저 확인해 보자.",
      }),
    });

    const response = await PUT_GUARDIAN_WRONG_NOTE_FEEDBACK(request, {
      params: Promise.resolve({
        id: "note-1",
      }),
    });
    const body = (await response.json()) as {
      imagePath: string;
      feedback: {
        text: string;
      } | null;
    };

    expect(response.status).toBe(200);
    expect(body.imagePath).toBe("/api/v1/wrong-notes/note-1/image?studentId=student-1");
    expect(body.feedback?.text).toBe("부호를 먼저 확인해 보자.");
  });

  it("streams a student wrong-note image from repo-external storage", async () => {
    vi.stubEnv("APP_DATA_ROOT", ".tmp/test-route-data");

    const authCookie = await createAuthCookie(UserRole.student);
    const imagePath = await saveWrongNoteImage(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
      "image/png",
      "student-1",
      "note-1",
    );

    mockedFindStudent.mockResolvedValue(linkedStudent as never);
    mockedWrongNoteFindFirst.mockResolvedValue({
      imagePath,
    } as never);

    const response = await GET_STUDENT_WRONG_NOTE_IMAGE(
      new Request("http://localhost/api/v1/student/wrong-notes/note-1/image", {
        method: "GET",
        headers: {
          cookie: authCookie,
        },
      }),
      {
        params: Promise.resolve({
          id: "note-1",
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
  });

  it("streams a guardian wrong-note image only for an owned student", async () => {
    vi.stubEnv("APP_DATA_ROOT", ".tmp/test-route-data");

    const authCookie = await createAuthCookie(UserRole.guardian);
    const imagePath = await saveWrongNoteImage(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
      "image/png",
      "student-1",
      "note-1",
    );

    mockedFindStudent.mockResolvedValue(linkedStudent as never);
    mockedWrongNoteFindFirst.mockResolvedValue({
      imagePath,
    } as never);

    const response = await GET_GUARDIAN_WRONG_NOTE_IMAGE(
      new Request("http://localhost/api/v1/wrong-notes/note-1/image?studentId=student-1", {
        method: "GET",
        headers: {
          cookie: authCookie,
        },
      }),
      {
        params: Promise.resolve({
          id: "note-1",
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
  });

  it("returns 404 when the student wrong-note image file is missing", async () => {
    vi.stubEnv("APP_DATA_ROOT", ".tmp/test-route-data");

    const authCookie = await createAuthCookie(UserRole.student);

    mockedFindStudent.mockResolvedValue(linkedStudent as never);
    mockedWrongNoteFindFirst.mockResolvedValue({
      imagePath: "student-1/note-1/missing.png",
    } as never);

    const response = await GET_STUDENT_WRONG_NOTE_IMAGE(
      new Request("http://localhost/api/v1/student/wrong-notes/note-1/image", {
        method: "GET",
        headers: {
          cookie: authCookie,
        },
      }),
      {
        params: Promise.resolve({
          id: "note-1",
        }),
      },
    );
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("builds a guardian reason chart only for owned students", async () => {
    const authCookie = await createAuthCookie(UserRole.guardian);

    mockedFindStudent.mockResolvedValue(linkedStudent as never);
    mockedWrongNoteFindMany.mockResolvedValue([
      {
        reason: WrongNoteReason.calculation_mistake,
      },
      {
        reason: WrongNoteReason.lack_of_concept,
      },
      {
        reason: WrongNoteReason.lack_of_concept,
      },
    ] as never);

    const request = new Request("http://localhost/api/v1/wrong-notes/chart?studentId=student-1&dimension=reason&grade=2&semester=1", {
      method: "GET",
      headers: {
        cookie: authCookie,
      },
    });

    const response = await GET_GUARDIAN_WRONG_NOTE_CHART(request);
    const body = (await response.json()) as {
      chart: {
        dimension: string;
        bars: Array<{ key: string; value: number }>;
      };
    };

    expect(response.status).toBe(200);
    expect(body.chart.dimension).toBe("reason");
    expect(body.chart.bars.map((bar) => ({ key: bar.key, value: bar.value }))).toEqual([
      {
        key: "calculation_mistake",
        value: 1,
      },
      {
        key: "misread_question",
        value: 0,
      },
      {
        key: "lack_of_concept",
        value: 2,
      },
    ]);
  });
});
