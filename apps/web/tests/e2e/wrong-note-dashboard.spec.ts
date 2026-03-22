import { Buffer } from "node:buffer";
import { expect, test } from "@playwright/test";
import { AUTH_COOKIE_NAME } from "@/modules/auth/constants";
import { signAuthToken } from "@/modules/auth/jwt";

const appOrigin = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";
const onePixelPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2Lr1kAAAAASUVORK5CYII=", "base64");

async function createAuthToken(options: {
  sub: string;
  role: "student" | "guardian";
  loginId: string;
  name: string;
  email?: string;
  studentId?: string;
}) {
  return signAuthToken({
    sub: options.sub,
    role: options.role,
    email: options.email,
    loginId: options.loginId,
    name: options.name,
    studentId: options.studentId,
  });
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
      workbook: null | {
        studentWorkbookId: string;
        templateId: string;
        title: string;
        publisher: string;
        stageId: string;
        stageName: string;
      };
    }>,
    workbooks: [
      {
        id: "student-workbook-1",
        studentId: "student-note-e2e-1",
        isArchived: false,
        template: {
          id: "template-1",
          title: "개념원리 베이직 2-1",
          publisher: "개념원리",
          schoolLevel: "middle" as const,
          grade: 2,
          semester: 1,
          isActive: true,
          stages: [
            { id: "stage-1", name: "개념원리 이해", sortOrder: 0 },
            { id: "stage-2", name: "핵심문제 익히기", sortOrder: 1 },
          ],
        },
      },
    ],
    progress: {
      "node-3:stage-1": "completed",
      "node-3:stage-2": "in_progress",
    } as Record<string, "not_started" | "in_progress" | "completed">,
  };

  const unitOptionsByGrade: Record<string, Array<{ id: string; unitName: string; unitCode: string }>> = {
    "1": [
      { id: "node-1", unitName: "정수와 유리수", unitCode: "M1-S1-U2" },
      { id: "node-2", unitName: "소인수분해", unitCode: "M1-S1-U1" },
    ],
    "2": [
      { id: "node-3", unitName: "유리수와 순환소수", unitCode: "M2-S1-U1" },
      { id: "node-4", unitName: "식의 계산", unitCode: "M2-S1-U2" },
    ],
  };

  function buildChartPayload(query: URLSearchParams) {
    const grade = Number(query.get("grade") ?? "1");
    const semester = Number(query.get("semester") ?? "1");
    const dimension = (query.get("dimension") ?? "unit") as "unit" | "reason";
    const filteredNotes = state.wrongNotes.filter((note) => note.curriculum.grade === grade && note.curriculum.semester === semester);

    if (dimension === "reason") {
      const bars = [
        { key: "calculation_mistake", label: "단순 연산 실수", value: filteredNotes.filter((note) => note.reason.key === "calculation_mistake").length },
        { key: "misread_question", label: "문제 잘못 읽음", value: filteredNotes.filter((note) => note.reason.key === "misread_question").length },
        { key: "lack_of_concept", label: "문제 이해 못함", value: filteredNotes.filter((note) => note.reason.key === "lack_of_concept").length },
      ];

      return {
        student: state.student,
        chart: {
          dimension,
          grade,
          semester,
          bars,
          maxValue: Math.max(...bars.map((bar) => bar.value), 0),
          totalCount: filteredNotes.length,
        },
      };
    }

    const nodes = unitOptionsByGrade[String(grade)] ?? [];
    const bars = nodes.map((node) => ({
      key: node.id,
      label: node.unitName,
      value: filteredNotes.filter((note) => note.curriculum.curriculumNodeId === node.id).length,
      meta: {
        curriculumNodeId: node.id,
        unitCode: node.unitCode,
      },
    }));

    return {
      student: state.student,
      chart: {
        dimension,
        grade,
        semester,
        bars,
        maxValue: Math.max(...bars.map((bar) => bar.value), 0),
        totalCount: filteredNotes.length,
      },
    };
  }

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

  function buildWorkbookDashboard(query: URLSearchParams) {
    const grade = Number(query.get("grade") ?? String(state.student.grade));
    const selectedWorkbook =
      state.workbooks.find((workbook) => workbook.id === query.get("studentWorkbookId")) ??
      state.workbooks.find((workbook) => workbook.template.grade === grade) ??
      state.workbooks[0] ??
      null;
    const units = (unitOptionsByGrade[String(selectedWorkbook?.template.grade ?? grade)] ?? []).map((node) => ({
      curriculumNodeId: node.id,
      unitName: node.unitName,
      stageStates: (selectedWorkbook?.template.stages ?? []).map((stage) => ({
        workbookTemplateStageId: stage.id,
        stageName: stage.name,
        status: state.progress[`${node.id}:${stage.id}`] ?? "not_started",
        lastUpdatedAt: state.progress[`${node.id}:${stage.id}`] ? "2026-03-21T10:00:00.000Z" : null,
      })),
    }));
    const summary = units.reduce(
      (result, unit) => {
        for (const stage of unit.stageStates) {
          result.totalSteps += 1;
          if (stage.status === "completed") {
            result.completedCount += 1;
          } else if (stage.status === "in_progress") {
            result.inProgressCount += 1;
          } else {
            result.notStartedCount += 1;
          }
        }

        return result;
      },
      {
        totalSteps: 0,
        notStartedCount: 0,
        inProgressCount: 0,
        completedCount: 0,
      },
    );

    return {
      student: state.student,
      availableWorkbooks: state.workbooks,
      selectedWorkbook: selectedWorkbook
        ? {
            studentWorkbookId: selectedWorkbook.id,
            templateId: selectedWorkbook.template.id,
            title: selectedWorkbook.template.title,
            publisher: selectedWorkbook.template.publisher,
            grade: selectedWorkbook.template.grade,
            semester: selectedWorkbook.template.semester,
            stages: selectedWorkbook.template.stages,
          }
        : null,
      summary: {
        ...summary,
        completedPct: summary.totalSteps ? Math.round((summary.completedCount / summary.totalSteps) * 100) : 0,
      },
      unitBars: units.map((unit) => ({
        curriculumNodeId: unit.curriculumNodeId,
        unitName: unit.unitName,
        completedSteps: unit.stageStates.filter((stage) => stage.status === "completed").length,
        totalSteps: unit.stageStates.length,
      })),
      units,
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
    const requestUrl = new URL(route.request().url());
    const grade = requestUrl.searchParams.get("grade") ?? "1";

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        nodes: unitOptionsByGrade[grade] ?? [],
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

  await page.route("**/api/v1/student/wrong-notes/chart*", async (route) => {
    const requestUrl = new URL(route.request().url());

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildChartPayload(requestUrl.searchParams)),
    });
  });

  await page.route("**/api/v1/student/workbook-progress/dashboard*", async (route) => {
    const requestUrl = new URL(route.request().url());

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildWorkbookDashboard(requestUrl.searchParams)),
    });
  });

  await page.route("**/api/v1/student/workbook-progress", async (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}") as {
      curriculumNodeId: string;
      workbookTemplateStageId: string;
      status: "not_started" | "in_progress" | "completed";
    };
    state.progress[`${body.curriculumNodeId}:${body.workbookTemplateStageId}`] = body.status;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        row: {
          curriculumNodeId: body.curriculumNodeId,
          unitName: "유리수와 순환소수",
          stageStates: state.workbooks[0].template.stages.map((stage) => ({
            workbookTemplateStageId: stage.id,
            stageName: stage.name,
            status: state.progress[`${body.curriculumNodeId}:${stage.id}`] ?? "not_started",
            lastUpdatedAt: "2026-03-21T10:00:00.000Z",
          })),
        },
      }),
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
        imagePath: "/api/v1/student/wrong-notes/note-e2e-1/image",
        studentMemo: "부호를 잘못 봤어요.",
        createdAt: "2026-03-21T09:00:00.000Z",
        updatedAt: "2026-03-21T09:00:00.000Z",
        curriculum: {
          grade: 2,
          semester: 1,
          curriculumNodeId: "node-3",
          unitName: "유리수와 순환소수",
        },
        reason: {
          key: "calculation_mistake",
          labelKo: "단순 연산 실수",
        },
        feedback: null,
        workbook: {
          studentWorkbookId: "student-workbook-1",
          templateId: "template-1",
          title: "개념원리 베이직 2-1",
          publisher: "개념원리",
          stageId: "stage-2",
          stageName: "핵심문제 익히기",
        },
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

  await page.route("**/api/v1/student/wrong-notes/note-e2e-1/image", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/png",
      body: onePixelPng,
    });
  });

  await page.context().addCookies([
    {
      name: AUTH_COOKIE_NAME,
      value: studentToken,
      url: appOrigin,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/student/study/session");
  await page.waitForURL("**/student/dashboard");
  const chartSection = page.locator('section[aria-label="오답 현황 그래프"]');
  const filterSection = page.locator('article[aria-label="오답 탐색 필터"]');

  await page.getByLabel("사진 파일").setInputFiles({
    name: "wrong-note.png",
    mimeType: "image/png",
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
  });
  await page.getByLabel("문제집 선택").first().selectOption("student-workbook-1");
  await page.getByLabel("문제집 단계").first().selectOption("stage-2");
  await page.getByLabel("단원").first().selectOption("node-3");
  await page.getByLabel("학생 메모").first().fill("부호를 잘못 봤어요.");
  await page.getByRole("button", { name: "오답노트 저장" }).click();

  await expect(page.getByText("오답노트를 저장했습니다.")).toBeVisible();
  await expect(page.getByRole("button", { name: /유리수와 순환소수/ }).first()).toBeVisible();
  await expect(page.getByText("1건 누적")).toBeVisible();
  await expect(chartSection.getByText("정수와 유리수")).toBeVisible();
  await expect(page.getByText("개념원리 베이직 2-1 · 개념원리 · 핵심문제 익히기")).toBeVisible();
  await page.getByRole("button", { name: "닫기" }).click();

  const workbookSection = page.locator("section").filter({ has: page.getByRole("heading", { name: "문제집 진도" }) });
  await workbookSection.getByRole("button", { name: "진행중" }).first().click();
  await expect(workbookSection.getByRole("button", { name: "완료" }).first()).toBeVisible();

  await chartSection.getByLabel("대상 학년").selectOption("2");
  await expect(chartSection.getByText("유리수와 순환소수")).toBeVisible();
  await expect(filterSection.getByLabel("대상 학년")).toHaveValue("");

  await chartSection.getByLabel("그래프 기준").selectOption("reason");
  await expect(chartSection.getByText("단순 연산 실수")).toBeVisible();
  await expect(chartSection.getByText("유리수와 순환소수")).toHaveCount(0);

  await page.getByRole("button", { name: /유리수와 순환소수/ }).first().click();
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
  const note: {
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
    workbook: null | {
      studentWorkbookId: string;
      templateId: string;
      title: string;
      publisher: string;
      stageId: string;
      stageName: string;
    };
  } = {
    id: "note-e2e-1",
    imagePath: "/api/v1/wrong-notes/note-e2e-1/image?studentId=student-note-e2e-1",
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
    workbook: null as null | {
      studentWorkbookId: string;
      templateId: string;
      title: string;
      publisher: string;
      stageId: string;
      stageName: string;
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

  function buildGuardianChartPayload(query: URLSearchParams) {
    const grade = Number(query.get("grade") ?? String(student.grade));
    const semester = Number(query.get("semester") ?? "1");
    const dimension = (query.get("dimension") ?? "unit") as "unit" | "reason";

    if (dimension === "reason") {
      const matchesSelection = note.curriculum.grade === grade && note.curriculum.semester === semester;
      const bars = [
        { key: "calculation_mistake", label: "단순 연산 실수", value: note.reason.key === "calculation_mistake" && matchesSelection ? 1 : 0 },
        { key: "misread_question", label: "문제 잘못 읽음", value: note.reason.key === "misread_question" && matchesSelection ? 1 : 0 },
        { key: "lack_of_concept", label: "문제 이해 못함", value: note.reason.key === "lack_of_concept" && matchesSelection ? 1 : 0 },
      ];

      return {
        student,
        chart: {
          dimension,
          grade,
          semester,
          bars,
          maxValue: Math.max(...bars.map((bar) => bar.value), 0),
          totalCount: matchesSelection ? 1 : 0,
        },
      };
    }

    const nodesByGrade: Record<string, Array<{ id: string; unitName: string; unitCode: string }>> = {
      "1": [{ id: "node-1", unitName: "정수와 유리수", unitCode: "M1-S1-U2" }],
      "2": [{ id: "node-3", unitName: "유리수와 순환소수", unitCode: "M2-S1-U1" }],
    };
    const nodes = nodesByGrade[String(grade)] ?? [];
    const bars = nodes.map((node) => ({
      key: node.id,
      label: node.unitName,
      value: note.curriculum.curriculumNodeId === node.id && note.curriculum.semester === semester ? 1 : 0,
      meta: {
        curriculumNodeId: node.id,
        unitCode: node.unitCode,
      },
    }));

    return {
      student,
      chart: {
        dimension,
        grade,
        semester,
        bars,
        maxValue: Math.max(...bars.map((bar) => bar.value), 0),
        totalCount: note.curriculum.grade === grade && note.curriculum.semester === semester ? 1 : 0,
      },
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

  await page.route("**/api/v1/wrong-notes/chart*", async (route) => {
    const requestUrl = new URL(route.request().url());

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildGuardianChartPayload(requestUrl.searchParams)),
    });
  });

  await page.route("**/api/v1/workbook-templates", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        workbookTemplates: [],
      }),
    });
  });

  await page.route("**/api/v1/student-workbooks?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        student,
        studentWorkbooks: [],
      }),
    });
  });

  await page.route("**/api/v1/workbook-progress/dashboard*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        student,
        availableWorkbooks: [],
        selectedWorkbook: null,
        summary: {
          totalSteps: 0,
          notStartedCount: 0,
          inProgressCount: 0,
          completedCount: 0,
          completedPct: 0,
        },
        unitBars: [],
        units: [],
      }),
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

  await page.route("**/api/v1/wrong-notes/note-e2e-1/image?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/png",
      body: onePixelPng,
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
      name: AUTH_COOKIE_NAME,
      value: guardianToken,
      url: appOrigin,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/records/new");
  await page.waitForURL("**/dashboard");
  const guardianChartSection = page.locator('section[aria-label="오답 현황 그래프"]');
  const guardianFilterSection = page.locator('article[aria-label="오답 탐색 필터"]');

  await expect(guardianChartSection.getByText("정수와 유리수")).toBeVisible();
  await guardianChartSection.getByLabel("그래프 기준").selectOption("reason");
  await expect(guardianChartSection.getByText("문제 잘못 읽음")).toBeVisible();
  await expect(guardianFilterSection.getByLabel("대상 학년")).toHaveValue("");

  await page.getByRole("button", { name: /정수와 유리수/ }).first().click();
  await page.getByLabel("보호자 피드백").fill("문장을 끝까지 읽고 조건에 밑줄을 쳐보자.");
  await page.getByRole("button", { name: "피드백 저장" }).click();

  await expect(page.getByText("보호자 피드백을 저장했습니다.")).toBeVisible();
  await expect(page.getByRole("button", { name: /정수와 유리수/ }).first()).toContainText("피드백 있음");
});

test("student wrong-note dashboard shows a placeholder when the stored image file is missing", async ({ page }) => {
  const studentToken = await createAuthToken({
    sub: "student-user-note-missing",
    role: "student",
    loginId: "student-note-missing",
    name: "학생 오답노트 누락 이미지",
    studentId: "student-note-missing-1",
  });

  const student = {
    id: "student-note-missing-1",
    name: "학생 오답노트 누락 이미지",
    schoolLevel: "middle" as const,
    grade: 1,
  };
  const note = {
    id: "note-missing-1",
    imagePath: "/api/v1/student/wrong-notes/note-missing-1/image",
    studentMemo: "이미지 파일이 없는 상태를 확인합니다.",
    createdAt: "2026-03-22T09:00:00.000Z",
    updatedAt: "2026-03-22T09:00:00.000Z",
    curriculum: {
      grade: 1,
      semester: 1,
      curriculumNodeId: "node-1",
      unitName: "정수와 유리수",
    },
    reason: {
      key: "lack_of_concept" as const,
      labelKo: "문제 이해 못함",
    },
    feedback: null,
    workbook: null,
  };

  await page.route("**/api/v1/curriculum*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        nodes: [{ id: "node-1", unitName: "정수와 유리수", unitCode: "M1-S1-U1" }],
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
      body: JSON.stringify({
        student,
        summary: {
          totalNotes: 1,
          recent30DaysNotes: 1,
          feedbackCompletedNotes: 0,
          reasonCounts: {
            calculation_mistake: 0,
            misread_question: 0,
            lack_of_concept: 1,
          },
        },
        reasonDistribution: [
          { key: "calculation_mistake", labelKo: "단순 연산 실수", count: 0 },
          { key: "misread_question", labelKo: "문제 잘못 읽음", count: 0 },
          { key: "lack_of_concept", labelKo: "문제 이해 못함", count: 1 },
        ],
        topUnits: [
          {
            curriculumNodeId: "node-1",
            unitName: "정수와 유리수",
            count: 1,
          },
        ],
      }),
    });
  });

  await page.route("**/api/v1/student/wrong-notes/chart*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        student,
        chart: {
          dimension: "unit",
          grade: 1,
          semester: 1,
          bars: [{ key: "node-1", label: "정수와 유리수", value: 1 }],
          maxValue: 1,
          totalCount: 1,
        },
      }),
    });
  });

  await page.route("**/api/v1/student/workbook-progress/dashboard*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        student,
        availableWorkbooks: [],
        selectedWorkbook: null,
        summary: {
          totalSteps: 0,
          notStartedCount: 0,
          inProgressCount: 0,
          completedCount: 0,
          completedPct: 0,
        },
        unitBars: [],
        units: [],
      }),
    });
  });

  await page.route(/.*\/api\/v1\/student\/wrong-notes(\?.*)?$/, async (route) => {
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

  await page.route("**/api/v1/student/wrong-notes/note-missing-1", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(note),
    });
  });

  await page.route("**/api/v1/student/wrong-notes/note-missing-1/image", async (route) => {
    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "NOT_FOUND",
          message: "Wrong note image not found",
        },
      }),
    });
  });

  await page.context().addCookies([
    {
      name: AUTH_COOKIE_NAME,
      value: studentToken,
      url: appOrigin,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/student/dashboard");
  await expect(page.getByText("이미지 파일을 찾을 수 없습니다")).toBeVisible();
  await page.getByRole("button", { name: /정수와 유리수/ }).first().click();
  await expect(page.getByText("학생 화면에서 이미지를 다시 업로드해 주세요.")).toBeVisible();
});
