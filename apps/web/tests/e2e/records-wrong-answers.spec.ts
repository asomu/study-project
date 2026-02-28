import { SignJWT } from "jose";
import { expect, test } from "@playwright/test";
import {
  buildDashboardWave3Overview,
  buildDashboardWave3Trends,
  buildDashboardWave3Weakness,
  DASHBOARD_WAVE3_FIXED_AS_OF_DATE,
  DASHBOARD_WAVE3_FIXED_RANGE_START,
  DASHBOARD_WAVE3_TRENDS_ACTIVE_WEEK_LABEL,
  toCategoryLabel,
  type DashboardWave3State,
} from "./fixtures/dashboard-wave3-fixtures";

const guardianEmail = process.env.SEED_GUARDIAN_EMAIL ?? "guardian@example.com";
const guardianPassword = process.env.SEED_GUARDIAN_PASSWORD ?? "Guardian123!";
const jwtSecret = process.env.JWT_SECRET ?? "dev_secret_32_characters_minimum_123";

async function createAuthToken() {
  return new SignJWT({
    role: "guardian",
    email: guardianEmail,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("guardian-e2e")
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(jwtSecret));
}

test("login -> records/new -> wrong-answers/manage flow", async ({ page }) => {
  const token = await createAuthToken();

  const dashboardState: DashboardWave3State = {
    totalAttempts: 0,
    totalItems: 0,
    wrongAnswers: 0,
    categoryKeys: ["calculation_mistake"],
  };

  const dashboardQueryHistory: {
    overviewDates: string[];
    weaknessPeriods: string[];
    trendsRanges: Array<{ rangeStart: string | null; rangeEnd: string | null }>;
  } = {
    overviewDates: [],
    weaknessPeriods: [],
    trendsRanges: [],
  };

  const wrongAnswerState: {
    id: string;
    memo: string | null;
    imagePath: string | null;
    categories: Array<{ key: string; labelKo: string }>;
  } = {
    id: "wa-e2e-1",
    memo: "오답 메모",
    imagePath: null,
    categories: [{ key: "calculation_mistake", labelKo: "단순 연산 실수" }],
  };

  function toWrongAnswerResponse() {
    return {
      id: wrongAnswerState.id,
      attemptItemId: "attempt-item-e2e-1",
      memo: wrongAnswerState.memo,
      imagePath: wrongAnswerState.imagePath,
      reviewedAt: null,
      createdAt: "2026-02-21T00:00:00.000Z",
      updatedAt: "2026-02-21T00:00:00.000Z",
      categories: wrongAnswerState.categories,
      attemptItem: {
        id: "attempt-item-e2e-1",
        attemptId: "attempt-e2e-1",
        curriculumNodeId: "curriculum-e2e-1",
        problemNo: 3,
        isCorrect: false,
        difficulty: 2,
        attemptDate: "2026-02-21T00:00:00.000Z",
      },
    };
  }

  await page.route("**/api/v1/auth/login", async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        "content-type": "application/json",
        "set-cookie": `study_auth_token=${token}; Path=/; HttpOnly; SameSite=Lax`,
      },
      body: JSON.stringify({
        accessToken: token,
        user: {
          id: "guardian-e2e",
          role: "guardian",
          email: guardianEmail,
        },
      }),
    });
  });

  await page.route("**/api/v1/students", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        students: [
          {
            id: "student-e2e-1",
            name: "기본 학생",
            schoolLevel: "middle",
            grade: 1,
          },
        ],
      }),
    });
  });

  await page.route("**/api/v1/curriculum*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        nodes: [
          {
            id: "curriculum-e2e-1",
            unitCode: "M1-S1-U1",
            unitName: "소인수분해",
          },
        ],
        meta: {
          curriculumVersion: "2026.01",
          effectiveFrom: "2026-01-01T00:00:00.000Z",
          effectiveTo: null,
        },
      }),
    });
  });

  await page.route("**/api/v1/materials", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        id: "material-e2e-1",
      }),
    });
  });

  await page.route("**/api/v1/attempts", async (route) => {
    dashboardState.totalAttempts = 1;

    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        id: "attempt-e2e-1",
      }),
    });
  });

  await page.route("**/api/v1/attempts/*/items", async (route) => {
    dashboardState.totalItems = 1;

    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        attemptId: "attempt-e2e-1",
        items: [
          {
            id: "attempt-item-e2e-1",
          },
        ],
      }),
    });
  });

  await page.route("**/api/v1/wrong-answers/*/categories", async (route) => {
    const requestBody = (await route.request().postDataJSON()) as { categoryKeys: string[] };

    wrongAnswerState.categories = requestBody.categoryKeys.map((key) => ({
      key,
      labelKo: toCategoryLabel(key),
    }));
    dashboardState.categoryKeys = [...requestBody.categoryKeys];

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(toWrongAnswerResponse()),
    });
  });

  await page.route("**/api/v1/wrong-answers/*/image", async (route) => {
    wrongAnswerState.imagePath = "/uploads/wrong-answers/wa-e2e-1.png";

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        imagePath: wrongAnswerState.imagePath,
      }),
    });
  });

  await page.route("**/api/v1/wrong-answers*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === "POST" && url.pathname.endsWith("/api/v1/wrong-answers")) {
      const requestBody = (await request.postDataJSON()) as { memo?: string };
      wrongAnswerState.memo = requestBody.memo ?? null;
      dashboardState.wrongAnswers = 1;

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(toWrongAnswerResponse()),
      });
      return;
    }

    if (request.method() === "GET" && url.pathname.endsWith("/api/v1/wrong-answers")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          wrongAnswers: [toWrongAnswerResponse()],
        }),
      });
      return;
    }

    await route.fallback();
  });

  await page.route("**/api/v1/dashboard/overview*", async (route) => {
    const requestUrl = new URL(route.request().url());
    const asOfDate = requestUrl.searchParams.get("date") ?? DASHBOARD_WAVE3_FIXED_AS_OF_DATE;
    dashboardQueryHistory.overviewDates.push(asOfDate);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildDashboardWave3Overview(dashboardState, asOfDate)),
    });
  });

  await page.route("**/api/v1/dashboard/weakness*", async (route) => {
    const requestUrl = new URL(route.request().url());
    const period = requestUrl.searchParams.get("period") ?? "weekly";
    dashboardQueryHistory.weaknessPeriods.push(period);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildDashboardWave3Weakness(dashboardState)),
    });
  });

  await page.route("**/api/v1/dashboard/trends*", async (route) => {
    const requestUrl = new URL(route.request().url());
    const rangeStart = requestUrl.searchParams.get("rangeStart");
    const rangeEnd = requestUrl.searchParams.get("rangeEnd");
    dashboardQueryHistory.trendsRanges.push({ rangeStart, rangeEnd });

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildDashboardWave3Trends(dashboardState)),
    });
  });

  await page.goto("/login");

  await page.getByLabel("이메일").fill(guardianEmail);
  await page.getByLabel("비밀번호").fill(guardianPassword);
  await page.getByRole("button", { name: "로그인" }).click();

  await page.waitForURL("**/dashboard");
  await page.getByRole("link", { name: "기록 입력" }).click();
  await page.waitForURL("**/records/new");

  await page.getByLabel("문제집 제목").fill("디딤돌 중학수학 1-1");
  await page.getByLabel("출판사").fill("디딤돌");
  await page.getByRole("button", { name: "문제집 저장" }).click();
  await expect(page.getByText("materialId: material-e2e-1")).toBeVisible();

  await page.getByRole("button", { name: "시도 저장" }).click();
  await expect(page.getByText("attemptId: attempt-e2e-1")).toBeVisible();

  await page.getByLabel("문항 번호").fill("3");
  await page.getByLabel("난이도(선택)").fill("2");
  await page.getByLabel("오답 메모 (오답일 때만 저장)").fill("오답 메모");
  await page.getByRole("button", { name: "문항 저장" }).click();

  await expect(page.getByText("생성된 오답 ID:")).toContainText("wa-e2e-1");

  await page.getByRole("link", { name: "오답 관리 화면으로 이동" }).click();
  await page.waitForURL("**/wrong-answers/manage");

  await page.getByRole("button", { name: "오답 목록 조회" }).click();
  await expect(page.getByText("오답 1건을 불러왔습니다.")).toBeVisible();

  await page.getByLabel("문제 잘못 읽음 (misread_question)").first().check();
  await page.getByRole("button", { name: "카테고리 저장" }).first().click();
  await expect(page.getByText("카테고리가 저장되었습니다.")).toBeVisible();

  const firstWrongAnswerCard = page.locator("article").first();

  await firstWrongAnswerCard.locator('input[type="file"]').setInputFiles({
    name: "wrong-answer.png",
    mimeType: "image/png",
    buffer: Buffer.from("png-data"),
  });
  await firstWrongAnswerCard.getByRole("button", { name: "이미지 업로드" }).last().click();

  await expect(page.getByText("이미지가 업로드되었습니다.")).toBeVisible();
  await expect(page.getByText("현재 카테고리:")).toContainText("misread_question");
  await expect(page.getByRole("link", { name: "업로드된 이미지 보기" })).toBeVisible();

  await page.getByRole("link", { name: "대시보드" }).click();
  await page.waitForURL("**/dashboard");

  await expect(page.getByText("총 시도 1회 / 총 문항 1개")).toBeVisible();
  await expect(page.getByText("소인수분해")).toBeVisible();
  await expect(page.getByText("단순 연산 실수")).toBeVisible();
  await expect(page.getByText("문제 잘못 읽음")).toBeVisible();
  await expect(page.getByText(DASHBOARD_WAVE3_TRENDS_ACTIVE_WEEK_LABEL)).toBeVisible();

  await page.getByLabel("기준일").fill(DASHBOARD_WAVE3_FIXED_AS_OF_DATE);
  await page.getByLabel("약점 기간").selectOption("monthly");
  await page.getByRole("button", { name: "대시보드 갱신" }).click();

  await expect(page.getByText(`기준일 ${DASHBOARD_WAVE3_FIXED_AS_OF_DATE} 기준 최근 28일`)).toBeVisible();

  expect(dashboardQueryHistory.overviewDates).toContain(DASHBOARD_WAVE3_FIXED_AS_OF_DATE);
  expect(dashboardQueryHistory.weaknessPeriods).toContain("monthly");
  expect(
    dashboardQueryHistory.trendsRanges.some(
      (item) => item.rangeStart === DASHBOARD_WAVE3_FIXED_RANGE_START && item.rangeEnd === DASHBOARD_WAVE3_FIXED_AS_OF_DATE,
    ),
  ).toBe(true);
});
