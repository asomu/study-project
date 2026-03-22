import { Buffer } from "node:buffer";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GET as GET_GUARDIAN_WORKBOOK_PROGRESS_DASHBOARD } from "@/app/api/v1/workbook-progress/dashboard/route";
import { POST as POST_STUDENT_WORKBOOKS } from "@/app/api/v1/student-workbooks/route";
import { POST as POST_WORKBOOK_TEMPLATES } from "@/app/api/v1/workbook-templates/route";
import { POST as POST_STUDENT_WRONG_NOTES } from "@/app/api/v1/student/wrong-notes/route";
import { GET as GET_STUDENT_WORKBOOK_PROGRESS_DASHBOARD } from "@/app/api/v1/student/workbook-progress/dashboard/route";
import { PUT as PUT_STUDENT_WORKBOOK_PROGRESS } from "@/app/api/v1/student/workbook-progress/route";
import { prisma } from "@/lib/prisma";
import {
  clearTestUploadDirectory,
  createSeedGuardianAuthCookie,
  createSeedStudentAuthCookie,
  getSeedGuardian,
  resetSeedStudentAccountState,
  resetSeedStudentScopedData,
  SEEDED_GRADE2_CURRICULUM_NODE_ID,
  SEEDED_STUDENT_ID,
} from "./db-test-helpers";

const TEST_WORKBOOK_PREFIX = "[test] workbook-progress-real";

async function cleanupTemporaryWorkbooks() {
  const templates = await prisma.workbookTemplate.findMany({
    where: {
      title: {
        startsWith: TEST_WORKBOOK_PREFIX,
      },
    },
    select: {
      id: true,
    },
  });

  if (!templates.length) {
    return;
  }

  const templateIds = templates.map((template) => template.id);

  await prisma.studentWorkbookProgress.deleteMany({
    where: {
      studentWorkbook: {
        workbookTemplateId: {
          in: templateIds,
        },
      },
    },
  });
  await prisma.wrongNote.deleteMany({
    where: {
      studentWorkbook: {
        workbookTemplateId: {
          in: templateIds,
        },
      },
    },
  });
  await prisma.studentWorkbook.deleteMany({
    where: {
      workbookTemplateId: {
        in: templateIds,
      },
    },
  });
  await prisma.workbookTemplateStage.deleteMany({
    where: {
      workbookTemplateId: {
        in: templateIds,
      },
    },
  });
  await prisma.workbookTemplate.deleteMany({
    where: {
      id: {
        in: templateIds,
      },
    },
  });
}

describe("real integration: workbook progress workflow", () => {
  beforeAll(async () => {
    await getSeedGuardian();
  });

  beforeEach(async () => {
    await cleanupTemporaryWorkbooks();
    await resetSeedStudentScopedData();
    await resetSeedStudentAccountState();
    await clearTestUploadDirectory();
  });

  afterAll(async () => {
    await cleanupTemporaryWorkbooks();
    await resetSeedStudentScopedData();
    await resetSeedStudentAccountState();
    await clearTestUploadDirectory();
    await prisma.$disconnect();
  });

  it("creates a workbook template, assigns it, updates progress, and links a wrong-note", async () => {
    const [guardianAuthCookie, studentAuthCookie] = await Promise.all([
      createSeedGuardianAuthCookie(),
      createSeedStudentAuthCookie(),
    ]);

    const createTemplateResponse = await POST_WORKBOOK_TEMPLATES(
      new Request("http://localhost/api/v1/workbook-templates", {
        method: "POST",
        headers: {
          cookie: guardianAuthCookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title: `${TEST_WORKBOOK_PREFIX} 2-1`,
          publisher: "개념원리",
          schoolLevel: "middle",
          grade: 2,
          semester: 1,
          stages: [
            { name: "개념원리 이해", sortOrder: 0 },
            { name: "핵심문제 익히기", sortOrder: 1 },
          ],
        }),
      }),
    );
    const createdTemplate = (await createTemplateResponse.json()) as {
      id: string;
      stages: Array<{ id: string; name: string }>;
    };

    expect(createTemplateResponse.status).toBe(201);
    expect(createdTemplate.stages.length).toBe(2);

    const assignResponse = await POST_STUDENT_WORKBOOKS(
      new Request("http://localhost/api/v1/student-workbooks", {
        method: "POST",
        headers: {
          cookie: guardianAuthCookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          studentId: SEEDED_STUDENT_ID,
          workbookTemplateId: createdTemplate.id,
        }),
      }),
    );
    const assignedWorkbook = (await assignResponse.json()) as {
      id: string;
      template: {
        title: string;
      };
    };

    expect(assignResponse.status).toBe(201);
    expect(assignedWorkbook.template.title).toContain(TEST_WORKBOOK_PREFIX);

    const studentDashboardResponse = await GET_STUDENT_WORKBOOK_PROGRESS_DASHBOARD(
      new Request(`http://localhost/api/v1/student/workbook-progress/dashboard?grade=2&studentWorkbookId=${assignedWorkbook.id}`, {
        method: "GET",
        headers: {
          cookie: studentAuthCookie,
        },
      }),
    );
    const studentDashboardBody = (await studentDashboardResponse.json()) as {
      selectedWorkbook: {
        studentWorkbookId: string;
        stages: Array<{ id: string }>;
      } | null;
      summary: {
        totalSteps: number;
        completedCount: number;
      };
    };

    expect(studentDashboardResponse.status).toBe(200);
    expect(studentDashboardBody.selectedWorkbook?.studentWorkbookId).toBe(assignedWorkbook.id);
    expect(studentDashboardBody.summary.completedCount).toBe(0);

    const updateProgressResponse = await PUT_STUDENT_WORKBOOK_PROGRESS(
      new Request("http://localhost/api/v1/student/workbook-progress", {
        method: "PUT",
        headers: {
          cookie: studentAuthCookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          studentWorkbookId: assignedWorkbook.id,
          curriculumNodeId: SEEDED_GRADE2_CURRICULUM_NODE_ID,
          workbookTemplateStageId: createdTemplate.stages[0].id,
          status: "completed",
        }),
      }),
    );
    const updateProgressBody = (await updateProgressResponse.json()) as {
      row: {
        curriculumNodeId: string;
        stageStates: Array<{ workbookTemplateStageId: string; status: string }>;
      };
    };

    expect(updateProgressResponse.status).toBe(200);
    expect(updateProgressBody.row.curriculumNodeId).toBe(SEEDED_GRADE2_CURRICULUM_NODE_ID);
    expect(updateProgressBody.row.stageStates[0]?.status).toBe("completed");

    const guardianDashboardResponse = await GET_GUARDIAN_WORKBOOK_PROGRESS_DASHBOARD(
      new Request(
        `http://localhost/api/v1/workbook-progress/dashboard?studentId=${SEEDED_STUDENT_ID}&grade=2&studentWorkbookId=${assignedWorkbook.id}`,
        {
          method: "GET",
          headers: {
            cookie: guardianAuthCookie,
          },
        },
      ),
    );
    const guardianDashboardBody = (await guardianDashboardResponse.json()) as {
      summary: {
        completedCount: number;
        totalSteps: number;
      };
    };

    expect(guardianDashboardResponse.status).toBe(200);
    expect(guardianDashboardBody.summary.completedCount).toBe(1);
    expect(guardianDashboardBody.summary.totalSteps).toBeGreaterThan(1);

    const createForm = new FormData();
    createForm.set(
      "file",
      new File([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])], "linked-note.png", {
        type: "image/png",
      }),
    );
    createForm.set("grade", "2");
    createForm.set("semester", "1");
    createForm.set("curriculumNodeId", SEEDED_GRADE2_CURRICULUM_NODE_ID);
    createForm.set("reason", "calculation_mistake");
    createForm.set("studentMemo", "핵심문제 익히기에서 계산 실수를 했어요.");
    createForm.set("studentWorkbookId", assignedWorkbook.id);
    createForm.set("workbookTemplateStageId", createdTemplate.stages[1].id);

    const createWrongNoteResponse = await POST_STUDENT_WRONG_NOTES(
      new Request("http://localhost/api/v1/student/wrong-notes", {
        method: "POST",
        headers: {
          cookie: studentAuthCookie,
        },
        body: createForm,
      }),
    );
    const createWrongNoteBody = (await createWrongNoteResponse.json()) as {
      id: string;
      workbook: {
        studentWorkbookId: string;
        title: string;
        stageId: string;
      } | null;
    };

    expect(createWrongNoteResponse.status).toBe(201);
    expect(createWrongNoteBody.workbook?.studentWorkbookId).toBe(assignedWorkbook.id);
    expect(createWrongNoteBody.workbook?.title).toContain(TEST_WORKBOOK_PREFIX);
    expect(createWrongNoteBody.workbook?.stageId).toBe(createdTemplate.stages[1].id);

    const storedWrongNote = await prisma.wrongNote.findUnique({
      where: {
        id: createWrongNoteBody.id,
      },
      select: {
        studentWorkbookId: true,
        workbookTemplateStageId: true,
      },
    });

    expect(storedWrongNote?.studentWorkbookId).toBe(assignedWorkbook.id);
    expect(storedWrongNote?.workbookTemplateStageId).toBe(createdTemplate.stages[1].id);
  });
});
