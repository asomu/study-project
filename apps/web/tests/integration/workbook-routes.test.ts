import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@prisma/client";
import { AUTH_COOKIE_NAME } from "@/modules/auth/constants";
import { signAuthToken } from "@/modules/auth/jwt";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    student: {
      findFirst: vi.fn(),
    },
    workbookTemplate: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    studentWorkbook: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    curriculumNode: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    studentWorkbookProgress: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { PUT as PUT_STUDENT_WORKBOOK_PROGRESS } from "@/app/api/v1/student/workbook-progress/route";
import { GET as GET_STUDENT_WORKBOOK_PROGRESS_DASHBOARD_PAGE } from "@/app/api/v1/student/workbook-progress/dashboard/route";
import { GET as GET_GUARDIAN_WORKBOOK_PROGRESS_DASHBOARD_PAGE } from "@/app/api/v1/workbook-progress/dashboard/route";
import { POST as POST_WORKBOOK_TEMPLATES } from "@/app/api/v1/workbook-templates/route";
import { POST as POST_STUDENT_WORKBOOKS } from "@/app/api/v1/student-workbooks/route";

const mockedFindStudent = vi.mocked(prisma.student.findFirst);
const mockedWorkbookTemplateFindMany = vi.mocked(prisma.workbookTemplate.findMany);
const mockedWorkbookTemplateFindFirst = vi.mocked(prisma.workbookTemplate.findFirst);
const mockedWorkbookTemplateCreate = vi.mocked(prisma.workbookTemplate.create);
const mockedStudentWorkbookFindMany = vi.mocked(prisma.studentWorkbook.findMany);
const mockedStudentWorkbookFindFirst = vi.mocked(prisma.studentWorkbook.findFirst);
const mockedStudentWorkbookFindUnique = vi.mocked(prisma.studentWorkbook.findUnique);
const mockedStudentWorkbookCreate = vi.mocked(prisma.studentWorkbook.create);
const mockedCurriculumNodeFindMany = vi.mocked(prisma.curriculumNode.findMany);
const mockedCurriculumNodeFindFirst = vi.mocked(prisma.curriculumNode.findFirst);
const mockedStudentWorkbookProgressFindMany = vi.mocked(prisma.studentWorkbookProgress.findMany);
const mockedStudentWorkbookProgressUpsert = vi.mocked(prisma.studentWorkbookProgress.upsert);

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

const workbookTemplateRecord = {
  id: "template-1",
  guardianUserId: "guardian-1",
  title: "개념원리 베이직 1-1",
  publisher: "개념원리",
  schoolLevel: "middle",
  grade: 1,
  semester: 1,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  stages: [
    {
      id: "stage-1",
      workbookTemplateId: "template-1",
      name: "개념원리 이해",
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "stage-2",
      workbookTemplateId: "template-1",
      name: "핵심문제 익히기",
      sortOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
};

const studentWorkbookRecord = {
  id: "student-workbook-1",
  studentId: "student-1",
  workbookTemplateId: "template-1",
  isArchived: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  workbookTemplate: workbookTemplateRecord,
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

describe("workbook routes", () => {
  beforeEach(() => {
    mockedFindStudent.mockReset();
    mockedWorkbookTemplateFindMany.mockReset();
    mockedWorkbookTemplateFindFirst.mockReset();
    mockedWorkbookTemplateCreate.mockReset();
    mockedStudentWorkbookFindMany.mockReset();
    mockedStudentWorkbookFindFirst.mockReset();
    mockedStudentWorkbookFindUnique.mockReset();
    mockedStudentWorkbookCreate.mockReset();
    mockedCurriculumNodeFindMany.mockReset();
    mockedCurriculumNodeFindFirst.mockReset();
    mockedStudentWorkbookProgressFindMany.mockReset();
    mockedStudentWorkbookProgressUpsert.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("creates a guardian workbook template with ordered stages", async () => {
    const authCookie = await createAuthCookie(UserRole.guardian);
    mockedWorkbookTemplateCreate.mockResolvedValue(workbookTemplateRecord as never);

    const response = await POST_WORKBOOK_TEMPLATES(
      new Request("http://localhost/api/v1/workbook-templates", {
        method: "POST",
        headers: {
          cookie: authCookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title: "개념원리 베이직 1-1",
          publisher: "개념원리",
          schoolLevel: "middle",
          grade: 1,
          semester: 1,
          stages: [
            { name: "핵심문제 익히기", sortOrder: 1 },
            { name: "개념원리 이해", sortOrder: 0 },
          ],
        }),
      }),
    );
    const body = (await response.json()) as {
      title: string;
      stages: Array<{ name: string; sortOrder: number }>;
    };

    expect(response.status).toBe(201);
    expect(body.title).toBe("개념원리 베이직 1-1");
    expect(mockedWorkbookTemplateCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          stages: {
            create: [
              { name: "개념원리 이해", sortOrder: 0 },
              { name: "핵심문제 익히기", sortOrder: 1 },
            ],
          },
        }),
      }),
    );
  });

  it("assigns a workbook template to a guardian-owned student", async () => {
    const authCookie = await createAuthCookie(UserRole.guardian);
    mockedFindStudent.mockResolvedValue(linkedStudent as never);
    mockedWorkbookTemplateFindFirst.mockResolvedValue({
      id: "template-1",
      schoolLevel: "middle",
      isActive: true,
    } as never);
    mockedStudentWorkbookFindUnique.mockResolvedValue(null as never);
    mockedStudentWorkbookCreate.mockResolvedValue(studentWorkbookRecord as never);

    const response = await POST_STUDENT_WORKBOOKS(
      new Request("http://localhost/api/v1/student-workbooks", {
        method: "POST",
        headers: {
          cookie: authCookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          studentId: "student-1",
          workbookTemplateId: "template-1",
        }),
      }),
    );
    const body = (await response.json()) as {
      id: string;
      template: {
        title: string;
      };
    };

    expect(response.status).toBe(201);
    expect(body.id).toBe("student-workbook-1");
    expect(body.template.title).toBe("개념원리 베이직 1-1");
  });

  it("rejects assigning an inactive workbook template", async () => {
    const authCookie = await createAuthCookie(UserRole.guardian);
    mockedFindStudent.mockResolvedValue(linkedStudent as never);
    mockedWorkbookTemplateFindFirst.mockResolvedValue({
      id: "template-1",
      schoolLevel: "middle",
      isActive: false,
    } as never);

    const response = await POST_STUDENT_WORKBOOKS(
      new Request("http://localhost/api/v1/student-workbooks", {
        method: "POST",
        headers: {
          cookie: authCookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          studentId: "student-1",
          workbookTemplateId: "template-1",
        }),
      }),
    );
    const body = (await response.json()) as { error: { code: string; message: string } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toContain("Inactive workbook templates");
    expect(mockedStudentWorkbookCreate).not.toHaveBeenCalled();
  });

  it("builds workbook dashboard with not_started defaults", async () => {
    const authCookie = await createAuthCookie(UserRole.student);
    mockedFindStudent.mockResolvedValue(linkedStudent as never);
    mockedStudentWorkbookFindMany.mockResolvedValue([studentWorkbookRecord] as never);
    mockedCurriculumNodeFindMany.mockResolvedValue([
      { id: "node-1", unitName: "소인수분해", unitCode: "M1-S1-U1", sortOrder: 1 },
      { id: "node-2", unitName: "정수와 유리수", unitCode: "M1-S1-U2", sortOrder: 2 },
    ] as never);
    mockedStudentWorkbookProgressFindMany.mockResolvedValue([
      {
        curriculumNodeId: "node-1",
        workbookTemplateStageId: "stage-1",
        status: "completed",
        lastUpdatedAt: new Date("2026-03-22T10:00:00.000Z"),
      },
    ] as never);

    const response = await GET_STUDENT_WORKBOOK_PROGRESS_DASHBOARD_PAGE(
      new Request("http://localhost/api/v1/student/workbook-progress/dashboard?grade=1", {
        method: "GET",
        headers: {
          cookie: authCookie,
        },
      }),
    );
    const body = (await response.json()) as {
      selectedWorkbook: { title: string } | null;
      summary: { totalSteps: number; completedCount: number; notStartedCount: number };
      units: Array<{ unitName: string; stageStates: Array<{ status: string }> }>;
    };

    expect(response.status).toBe(200);
    expect(body.selectedWorkbook?.title).toBe("개념원리 베이직 1-1");
    expect(body.summary.totalSteps).toBe(4);
    expect(body.summary.completedCount).toBe(1);
    expect(body.summary.notStartedCount).toBe(3);
    expect(body.units[0]?.stageStates[1]?.status).toBe("not_started");
  });

  it("returns an empty workbook dashboard when the selected grade has no assigned workbook", async () => {
    const authCookie = await createAuthCookie(UserRole.student);
    mockedFindStudent.mockResolvedValue(linkedStudent as never);
    mockedStudentWorkbookFindMany.mockResolvedValue([studentWorkbookRecord] as never);

    const response = await GET_STUDENT_WORKBOOK_PROGRESS_DASHBOARD_PAGE(
      new Request("http://localhost/api/v1/student/workbook-progress/dashboard?grade=2", {
        method: "GET",
        headers: {
          cookie: authCookie,
        },
      }),
    );
    const body = (await response.json()) as {
      selectedWorkbook: { title: string } | null;
      summary: { totalSteps: number; completedCount: number; notStartedCount: number };
      units: Array<unknown>;
    };

    expect(response.status).toBe(200);
    expect(body.selectedWorkbook).toBeNull();
    expect(body.summary.totalSteps).toBe(0);
    expect(body.summary.completedCount).toBe(0);
    expect(body.summary.notStartedCount).toBe(0);
    expect(body.units).toEqual([]);
  });

  it("returns 404 when the student requests an unavailable workbook id", async () => {
    const authCookie = await createAuthCookie(UserRole.student);
    mockedFindStudent.mockResolvedValue(linkedStudent as never);
    mockedStudentWorkbookFindMany.mockResolvedValue([studentWorkbookRecord] as never);

    const response = await GET_STUDENT_WORKBOOK_PROGRESS_DASHBOARD_PAGE(
      new Request("http://localhost/api/v1/student/workbook-progress/dashboard?studentWorkbookId=missing-workbook", {
        method: "GET",
        headers: {
          cookie: authCookie,
        },
      }),
    );
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 when the guardian requests an unavailable workbook id", async () => {
    const authCookie = await createAuthCookie(UserRole.guardian);
    mockedFindStudent.mockResolvedValue(linkedStudent as never);
    mockedStudentWorkbookFindMany.mockResolvedValue([studentWorkbookRecord] as never);

    const response = await GET_GUARDIAN_WORKBOOK_PROGRESS_DASHBOARD_PAGE(
      new Request("http://localhost/api/v1/workbook-progress/dashboard?studentId=student-1&studentWorkbookId=missing-workbook", {
        method: "GET",
        headers: {
          cookie: authCookie,
        },
      }),
    );
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("updates workbook progress for a valid student workbook cell", async () => {
    const authCookie = await createAuthCookie(UserRole.student);
    mockedFindStudent.mockResolvedValue(linkedStudent as never);
    mockedStudentWorkbookFindFirst.mockResolvedValue(studentWorkbookRecord as never);
    mockedCurriculumNodeFindFirst.mockResolvedValue({
      id: "node-1",
      unitName: "소인수분해",
      unitCode: "M1-S1-U1",
      sortOrder: 1,
    } as never);
    mockedStudentWorkbookProgressUpsert.mockResolvedValue({
      id: "progress-1",
    } as never);
    mockedStudentWorkbookProgressFindMany.mockResolvedValue([
      {
        curriculumNodeId: "node-1",
        workbookTemplateStageId: "stage-1",
        status: "completed",
        lastUpdatedAt: new Date("2026-03-22T10:00:00.000Z"),
      },
    ] as never);

    const response = await PUT_STUDENT_WORKBOOK_PROGRESS(
      new Request("http://localhost/api/v1/student/workbook-progress", {
        method: "PUT",
        headers: {
          cookie: authCookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          studentWorkbookId: "student-workbook-1",
          curriculumNodeId: "node-1",
          workbookTemplateStageId: "stage-1",
          status: "completed",
        }),
      }),
    );
    const body = (await response.json()) as {
      row: {
        curriculumNodeId: string;
        stageStates: Array<{ status: string }>;
      };
    };

    expect(response.status).toBe(200);
    expect(body.row.curriculumNodeId).toBe("node-1");
    expect(body.row.stageStates[0]?.status).toBe("completed");
  });
});
