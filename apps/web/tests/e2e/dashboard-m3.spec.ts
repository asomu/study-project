import { SignJWT } from "jose";
import { expect, test } from "@playwright/test";

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

test("dashboard refreshes on student switch and shows empty-state CTA", async ({ page }) => {
  const token = await createAuthToken();

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
            name: "학습 데이터 학생",
            schoolLevel: "middle",
            grade: 1,
          },
          {
            id: "student-e2e-2",
            name: "데이터 없음 학생",
            schoolLevel: "middle",
            grade: 1,
          },
        ],
      }),
    });
  });

  await page.route("**/api/v1/dashboard/overview*", async (route) => {
    const requestUrl = new URL(route.request().url());
    const studentId = requestUrl.searchParams.get("studentId");
    const hasData = studentId === "student-e2e-1";

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        progress: {
          recommendedPct: 33.3,
          actualPct: hasData ? 60 : 0,
          coveredUnits: hasData ? 3 : 0,
          totalUnits: 5,
        },
        mastery: {
          overallScorePct: hasData ? 74.2 : 0,
          recentAccuracyPct: hasData ? 70 : 0,
          difficultyWeightedAccuracyPct: hasData ? 72.5 : 0,
        },
        summary: {
          totalAttempts: hasData ? 4 : 0,
          totalItems: hasData ? 12 : 0,
          wrongAnswers: hasData ? 3 : 0,
          asOfDate: "2026-02-21",
        },
      }),
    });
  });

  await page.route("**/api/v1/dashboard/weakness*", async (route) => {
    const requestUrl = new URL(route.request().url());
    const studentId = requestUrl.searchParams.get("studentId");
    const hasData = studentId === "student-e2e-1";

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        weakUnits: hasData
          ? [
              {
                curriculumNodeId: "unit-1",
                unitName: "소인수분해",
                attempts: 4,
                accuracyPct: 25,
                wrongCount: 3,
              },
            ]
          : [],
        categoryDistribution: hasData
          ? [{ key: "calculation_mistake", labelKo: "단순 연산 실수", count: 2, ratio: 66.7 }]
          : [],
      }),
    });
  });

  await page.route("**/api/v1/dashboard/trends*", async (route) => {
    const requestUrl = new URL(route.request().url());
    const studentId = requestUrl.searchParams.get("studentId");
    const hasData = studentId === "student-e2e-1";

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        points: hasData
          ? [
              {
                weekStart: "2026-02-03",
                weekEnd: "2026-02-09",
                totalItems: 6,
                correctItems: 4,
                accuracyPct: 66.7,
                masteryScorePct: 68.2,
              },
              {
                weekStart: "2026-02-10",
                weekEnd: "2026-02-16",
                totalItems: 6,
                correctItems: 5,
                accuracyPct: 83.3,
                masteryScorePct: 82.4,
              },
            ]
          : [],
      }),
    });
  });

  await page.goto("/login");
  await page.getByLabel("이메일").fill(guardianEmail);
  await page.getByLabel("비밀번호").fill(guardianPassword);
  await page.getByRole("button", { name: "로그인" }).click();

  await page.waitForURL("**/dashboard");
  await expect(page.getByText("총 시도 4회 / 총 문항 12개")).toBeVisible();
  await expect(page.getByText("소인수분해")).toBeVisible();

  await page.getByLabel("학생").selectOption("student-e2e-2");
  await expect(page.getByText("아직 집계할 학습 데이터가 없습니다.")).toBeVisible();
  await expect(page.getByRole("link", { name: "기록 입력으로 이동" })).toBeVisible();
});
