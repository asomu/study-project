import { Buffer } from "node:buffer";
import { SignJWT } from "jose";
import { expect, test } from "@playwright/test";

const jwtSecret = process.env.JWT_SECRET ?? "dev_secret_32_characters_minimum_123";
const appOrigin = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";

async function createAuthToken(options: {
  sub: string;
  role: "student" | "guardian";
  loginId: string;
  name: string;
  email?: string;
  studentId?: string;
}) {
  return new SignJWT({
    role: options.role,
    email: options.email,
    loginId: options.loginId,
    name: options.name,
    studentId: options.studentId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(options.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(jwtSecret));
}

test("student wrong-note dashboard uploads and reflects a new note", async ({ page }) => {
  const studentToken = await createAuthToken({
    sub: "student-user-note-e2e",
    role: "student",
    loginId: "student-note-e2e",
    name: "학생 오답노트 E2E",
    studentId: "student-note-e2e-1",
  });

  const state = {
    student: {
      id: "student-note-e2e-1",
      name: "학생 오답노트 E2E",
      schoolLevel: "middle" as const,
      grade: 1,
    },
    wrongNotes: [] as Array<{
      id: string;
      imagePath: string;
      studentMemo: string | null;
      createdAt: string;
      updatedAt: string;
      curriculum: {
        grade: number;
        semester: number;
        curriculumNodeId: string;
        unitName: string;
      };
      reason: {
        key: "calculation_mistake" | "misread_question" | "lack_of_concept";
        labelKo: string;
      };
      feedback: null | {
        text: string;
        updatedAt: string | null;
        guardianUserId: string | null;
      };
    }>,
  };

  const unitOptions = [
    { id: "node-1", unitName: "정수와 유리수", unitCode: "M1-S1-U2" },
    { id: "node-2", unitName: "소인수분해", unitCode: "M1-S1-U1" },
  ];

  function buildDashboardPayload() {
    const reasonCounts = {
      calculation_mistake: 0,
      misread_question: 0,
      lack_of_concept: 0,
    };

    for (const note of state.wrongNotes) {
      reasonCounts[note.reason.key] += 1;
    }

    return {
      student: state.student,
      summary: {
        totalNotes: state.wrongNotes.length,
        recent30DaysNotes: state.wrongNotes.length,
        feedbackCompletedNotes: state.wrongNotes.filter((note) => Boolean(note.feedback)).length,
        reasonCounts,
      },
      reasonDistribution: [
        { key: "calculation_mistake", labelKo: "단순 연산 실수", count: reasonCounts.calculation_mistake },
        { key: "misread_question", labelKo: "문제 잘못 읽음", count: reasonCounts.misread_question },
        { key: "lack_of_concept", labelKo: "문제 이해 못함", count: reasonCounts.lack_of_concept },
      ],
      topUnits: state.wrongNotes.length
        ? [
            {
              curriculumNodeId: state.wrongNotes[0].curriculum.curriculumNodeId,
              unitName: state.wrongNotes[0].curriculum.unitName,
              count: state.wrongNotes.length,
            },
          ]
        : [],
    };
  }

  function buildListPayload() {
    return {
      student: state.student,
      pagination: {
        page: 1,
        pageSize: 12,
        totalItems: state.wrongNotes.length,
        totalPages: 1,
      },
      wrongNotes: state.wrongNotes,
    };
  }

  await page.route("**/api/v1/curriculum*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        nodes: unitOptions,
        meta: {
          curriculumVersion: "2026.01",
          effectiveFrom: "2026-01-01T00:00:00.000Z",
          effectiveTo: null,
        },
      }),
    });
  });

  await page.route("**/api/v1/student/wrong-notes/dashboard", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildDashboardPayload()),
    });
  });

  await page.route(/.*\/api\/v1\/student\/wrong-notes(\?.*)?$/, async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildListPayload()),
      });
      return;
    }

    state.wrongNotes = [
      {
        id: "note-e2e-1",
        imagePath: "/uploads/wrong-notes/note-e2e-1.png",
        studentMemo: "부호를 잘못 봤어요.",
        createdAt: "2026-03-21T09:00:00.000Z",
        updatedAt: "2026-03-21T09:00:00.000Z",
        curriculum: {
          grade: 1,
          semester: 1,
          curriculumNodeId: "node-1",
          unitName: "정수와 유리수",
        },
        reason: {
          key: "calculation_mistake",
          labelKo: "단순 연산 실수",
        },
        feedback: null,
      },
    ];

    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify(state.wrongNotes[0]),
    });
  });

  await page.route("**/api/v1/student/wrong-notes/note-e2e-1", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(state.wrongNotes[0]),
      });
      return;
    }

    state.wrongNotes[0] = {
      ...state.wrongNotes[0],
      studentMemo: "부호를 반대로 처리했어요.",
      updatedAt: "2026-03-21T10:00:00.000Z",
    };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(state.wrongNotes[0]),
    });
  });

  await page.context().addCookies([
    {
      name: "study_auth_token",
      value: studentToken,
      url: appOrigin,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/student/study/session");
  await page.waitForURL("**/student/dashboard");
  await page.getByLabel("사진 파일").setInputFiles({
    name: "wrong-note.png",
    mimeType: "image/png",
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
  });
  await page.getByLabel("단원").first().selectOption("node-1");
  await page.getByLabel("학생 메모").first().fill("부호를 잘못 봤어요.");
  await page.getByRole("button", { name: "오답노트 저장" }).click();

  await expect(page.getByText("오답노트를 저장했습니다.")).toBeVisible();
  await expect(page.getByRole("button", { name: /정수와 유리수/ }).first()).toBeVisible();
  await expect(page.getByText("1건 누적")).toBeVisible();

  await page.getByLabel("학생 메모").last().fill("부호를 반대로 처리했어요.");
  await page.getByRole("button", { name: "수정 저장" }).click();

  await expect(page.getByText("오답 상세를 저장했습니다.")).toBeVisible();
});

test("guardian wrong-note dashboard stores manual feedback", async ({ page }) => {
  const guardianToken = await createAuthToken({
    sub: "guardian-note-e2e",
    role: "guardian",
    loginId: "guardian@example.com",
    email: "guardian@example.com",
    name: "보호자 오답노트 E2E",
  });

  const student = {
    id: "student-note-e2e-1",
    name: "학생 오답노트 E2E",
    schoolLevel: "middle" as const,
    grade: 1,
  };
  const note = {
    id: "note-e2e-1",
    imagePath: "/uploads/wrong-notes/note-e2e-1.png",
    studentMemo: "문장을 끝까지 읽지 않았어요.",
    createdAt: "2026-03-21T09:00:00.000Z",
    updatedAt: "2026-03-21T09:00:00.000Z",
    curriculum: {
      grade: 1,
      semester: 1,
      curriculumNodeId: "node-1",
      unitName: "정수와 유리수",
    },
    reason: {
      key: "misread_question" as const,
      labelKo: "문제 잘못 읽음",
    },
    feedback: null as null | {
      text: string;
      updatedAt: string | null;
      guardianUserId: string | null;
    },
  };

  function buildGuardianDashboard() {
    return {
      student,
      summary: {
        totalNotes: 1,
        recent30DaysNotes: 1,
        feedbackCompletedNotes: note.feedback ? 1 : 0,
        reasonCounts: {
          calculation_mistake: 0,
          misread_question: 1,
          lack_of_concept: 0,
        },
      },
      reasonDistribution: [
        { key: "calculation_mistake", labelKo: "단순 연산 실수", count: 0 },
        { key: "misread_question", labelKo: "문제 잘못 읽음", count: 1 },
        { key: "lack_of_concept", labelKo: "문제 이해 못함", count: 0 },
      ],
      topUnits: [
        {
          curriculumNodeId: "node-1",
          unitName: "정수와 유리수",
          count: 1,
        },
      ],
    };
  }

  await page.route("**/api/v1/students", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        students: [student],
      }),
    });
  });

  await page.route("**/api/v1/wrong-notes/dashboard*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildGuardianDashboard()),
    });
  });

  await page.route("**/api/v1/wrong-notes?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        student,
        pagination: {
          page: 1,
          pageSize: 12,
          totalItems: 1,
          totalPages: 1,
        },
        wrongNotes: [note],
      }),
    });
  });

  await page.route("**/api/v1/wrong-notes/note-e2e-1?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(note),
    });
  });

  await page.route("**/api/v1/wrong-notes/note-e2e-1/feedback", async (route) => {
    note.feedback = {
      text: "문장을 끝까지 읽고 조건에 밑줄을 쳐보자.",
      updatedAt: "2026-03-21T10:30:00.000Z",
      guardianUserId: "guardian-note-e2e",
    };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(note),
    });
  });

  await page.context().addCookies([
    {
      name: "study_auth_token",
      value: guardianToken,
      url: appOrigin,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/records/new");
  await page.waitForURL("**/dashboard");
  await page.getByRole("button", { name: /정수와 유리수/ }).first().click();
  await page.getByLabel("보호자 피드백").fill("문장을 끝까지 읽고 조건에 밑줄을 쳐보자.");
  await page.getByRole("button", { name: "피드백 저장" }).click();

  await expect(page.getByText("보호자 피드백을 저장했습니다.")).toBeVisible();
  await expect(page.getByRole("button", { name: /정수와 유리수/ }).first()).toContainText("피드백 있음");
});
