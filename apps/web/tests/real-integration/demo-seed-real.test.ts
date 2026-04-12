import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GET as GET_GUARDIAN_WORKBOOK_DASHBOARD } from "@/app/api/v1/workbook-progress/dashboard/route";
import { GET as GET_GUARDIAN_WRONG_NOTES } from "@/app/api/v1/wrong-notes/route";
import { GET as GET_STUDENT_WORKBOOK_DASHBOARD } from "@/app/api/v1/student/workbook-progress/dashboard/route";
import { GET as GET_STUDENT_WRONG_NOTE_DASHBOARD } from "@/app/api/v1/student/wrong-notes/dashboard/route";
import { prisma } from "@/lib/prisma";
import {
  clearDemoData,
  DEMO_CURRICULUM_VERSION,
  DEMO_STUDENT_LOGIN_ID,
  DEMO_STUDENT_PASSWORD,
  DEMO_STUDENT_ID,
  DEMO_STUDENT_WORKBOOK_ID,
  ensureDemoStudentLogin,
  seedDemoData,
} from "@/modules/demo/demo-data";
import { createSeedGuardianAuthCookie, createSeedStudentAuthCookie, getSeedGuardian, resetSeedStudentAccountState } from "./db-test-helpers";

describe("real integration: demo seed", () => {
  beforeAll(async () => {
    await getSeedGuardian();
  });

  beforeEach(async () => {
    await clearDemoData();
    await resetSeedStudentAccountState();
  });

  afterAll(async () => {
    await clearDemoData();
    await resetSeedStudentAccountState();
    await prisma.$disconnect();
  });

  it("activates the demo student login idempotently with configured credentials", async () => {
    const firstActivation = await ensureDemoStudentLogin({
      displayName: "데모 학생",
    });
    const secondActivation = await ensureDemoStudentLogin({
      displayName: "데모 학생",
    });

    const student = await prisma.student.findUnique({
      where: {
        id: DEMO_STUDENT_ID,
      },
      include: {
        loginUser: {
          include: {
            credentialIdentifiers: true,
          },
        },
      },
    });

    expect(firstActivation.alreadyActive).toBe(false);
    expect(secondActivation.alreadyActive).toBe(true);
    expect(firstActivation.loginId).toBe(DEMO_STUDENT_LOGIN_ID);
    expect(secondActivation.loginId).toBe(DEMO_STUDENT_LOGIN_ID);
    expect(student?.loginUser?.loginId).toBe(DEMO_STUDENT_LOGIN_ID);
    expect(student?.loginUser?.credentialIdentifiers.some((item) => item.value === DEMO_STUDENT_LOGIN_ID)).toBe(true);
    expect(student?.loginUser?.passwordHash).not.toBe(DEMO_STUDENT_PASSWORD);
  });

  it("is idempotent and fills current wrong-note + workbook demo views", async () => {
    const referenceDate = new Date("2026-03-23T00:00:00.000Z");
    await ensureDemoStudentLogin();
    const [guardianAuthCookie, studentAuthCookie] = await Promise.all([
      createSeedGuardianAuthCookie(),
      createSeedStudentAuthCookie(),
    ]);

    const firstSeed = await seedDemoData({ referenceDate });
    const secondSeed = await seedDemoData({ referenceDate });

    expect(firstSeed).toEqual(secondSeed);
    expect(firstSeed.studentWorkbookId).toBe(DEMO_STUDENT_WORKBOOK_ID);
    expect(firstSeed.wrongNoteCount).toBe(3);
    expect(firstSeed.progressRowCount).toBe(3);

    const [wrongNotes, progressRows] = await Promise.all([
      prisma.wrongNote.findMany({
        where: {
          studentId: DEMO_STUDENT_ID,
          deletedAt: null,
        },
        include: {
          workbookTemplateStage: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.studentWorkbookProgress.findMany({
        where: {
          studentWorkbookId: DEMO_STUDENT_WORKBOOK_ID,
        },
      }),
    ]);

    expect(wrongNotes).toHaveLength(3);
    expect(wrongNotes.some((wrongNote) => Boolean(wrongNote.guardianFeedback))).toBe(true);
    expect(wrongNotes.some((wrongNote) => Boolean(wrongNote.studentWorkbookId && wrongNote.workbookTemplateStageId))).toBe(true);
    expect(progressRows).toHaveLength(3);

    const studentDashboardResponse = await GET_STUDENT_WRONG_NOTE_DASHBOARD(
      new Request("http://localhost/api/v1/student/wrong-notes/dashboard", {
        method: "GET",
        headers: {
          cookie: studentAuthCookie,
        },
      }),
    );
    const studentDashboardBody = (await studentDashboardResponse.json()) as {
      summary: {
        totalNotes: number;
        feedbackCompletedNotes: number;
      };
    };

    expect(studentDashboardResponse.status).toBe(200);
    expect(studentDashboardBody.summary.totalNotes).toBe(3);
    expect(studentDashboardBody.summary.feedbackCompletedNotes).toBe(1);

    const guardianWrongNotesResponse = await GET_GUARDIAN_WRONG_NOTES(
      new Request(`http://localhost/api/v1/wrong-notes?studentId=${DEMO_STUDENT_ID}`, {
        method: "GET",
        headers: {
          cookie: guardianAuthCookie,
        },
      }),
    );
    const guardianWrongNotesBody = (await guardianWrongNotesResponse.json()) as {
      pagination: {
        totalItems: number;
      };
      wrongNotes: Array<{
        workbook: {
          studentWorkbookId: string;
          stageName: string;
        } | null;
        feedback: {
          text: string;
        } | null;
      }>;
    };

    expect(guardianWrongNotesResponse.status).toBe(200);
    expect(guardianWrongNotesBody.pagination.totalItems).toBe(3);
    expect(guardianWrongNotesBody.wrongNotes.some((wrongNote) => wrongNote.workbook?.studentWorkbookId === DEMO_STUDENT_WORKBOOK_ID)).toBe(true);
    expect(
      guardianWrongNotesBody.wrongNotes.some(
        (wrongNote) => wrongNote.feedback?.text === "등식의 양변에 같은 계산을 적용하는 흐름을 한 줄씩 다시 써보자.",
      ),
    ).toBe(true);

    const studentWorkbookResponse = await GET_STUDENT_WORKBOOK_DASHBOARD(
      new Request(`http://localhost/api/v1/student/workbook-progress/dashboard?grade=1&studentWorkbookId=${DEMO_STUDENT_WORKBOOK_ID}`, {
        method: "GET",
        headers: {
          cookie: studentAuthCookie,
        },
      }),
    );
    const studentWorkbookBody = (await studentWorkbookResponse.json()) as {
      selectedWorkbook: {
        studentWorkbookId: string;
      } | null;
      summary: {
        totalSteps: number;
        completedCount: number;
        inProgressCount: number;
      };
    };

    expect(studentWorkbookResponse.status).toBe(200);
    expect(studentWorkbookBody.selectedWorkbook?.studentWorkbookId).toBe(DEMO_STUDENT_WORKBOOK_ID);
    expect(studentWorkbookBody.summary.totalSteps).toBeGreaterThan(0);
    expect(studentWorkbookBody.summary.completedCount).toBe(2);
    expect(studentWorkbookBody.summary.inProgressCount).toBe(1);

    const guardianWorkbookResponse = await GET_GUARDIAN_WORKBOOK_DASHBOARD(
      new Request(
        `http://localhost/api/v1/workbook-progress/dashboard?studentId=${DEMO_STUDENT_ID}&grade=1&studentWorkbookId=${DEMO_STUDENT_WORKBOOK_ID}`,
        {
          method: "GET",
          headers: {
            cookie: guardianAuthCookie,
          },
        },
      ),
    );
    const guardianWorkbookBody = (await guardianWorkbookResponse.json()) as {
      selectedWorkbook: {
        studentWorkbookId: string;
      } | null;
      summary: {
        completedCount: number;
      };
    };

    expect(guardianWorkbookResponse.status).toBe(200);
    expect(guardianWorkbookBody.selectedWorkbook?.studentWorkbookId).toBe(DEMO_STUDENT_WORKBOOK_ID);
    expect(guardianWorkbookBody.summary.completedCount).toBe(2);
  });

  it("clears only current demo wrong-note/workbook data while preserving base seed records", async () => {
    await seedDemoData({ referenceDate: new Date("2026-03-23T00:00:00.000Z") });
    await clearDemoData();

    const [guardian, student, studentWorkbook, curriculumNodes, wrongNotes, progressRows] = await Promise.all([
      prisma.user.findUnique({
        where: {
          email: "guardian@example.com",
        },
      }),
      prisma.student.findUnique({
        where: {
          id: DEMO_STUDENT_ID,
        },
      }),
      prisma.studentWorkbook.findUnique({
        where: {
          id: DEMO_STUDENT_WORKBOOK_ID,
        },
      }),
      prisma.curriculumNode.count({
        where: {
          curriculumVersion: DEMO_CURRICULUM_VERSION,
        },
      }),
      prisma.wrongNote.count({
        where: {
          studentId: DEMO_STUDENT_ID,
        },
      }),
      prisma.studentWorkbookProgress.count({
        where: {
          studentWorkbookId: DEMO_STUDENT_WORKBOOK_ID,
        },
      }),
    ]);

    expect(guardian).not.toBeNull();
    expect(student).not.toBeNull();
    expect(studentWorkbook).not.toBeNull();
    expect(curriculumNodes).toBeGreaterThan(0);
    expect(wrongNotes).toBe(0);
    expect(progressRows).toBe(0);
  });
});
