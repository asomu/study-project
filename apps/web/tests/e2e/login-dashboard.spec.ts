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

test("login to dashboard flow", async ({ page }) => {
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
            name: "기본 학생",
            schoolLevel: "middle",
            grade: 1,
          },
        ],
      }),
    });
  });

  await page.route("**/api/v1/dashboard/overview*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        progress: {
          recommendedPct: 30,
          actualPct: 10,
          coveredUnits: 1,
          totalUnits: 10,
        },
        mastery: {
          overallScorePct: 60,
          recentAccuracyPct: 66.7,
          difficultyWeightedAccuracyPct: 62.5,
        },
        summary: {
          totalAttempts: 1,
          totalItems: 3,
          wrongAnswers: 1,
          asOfDate: "2026-02-21",
        },
      }),
    });
  });

  await page.route("**/api/v1/dashboard/weakness*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        weakUnits: [],
        categoryDistribution: [],
      }),
    });
  });

  await page.route("**/api/v1/dashboard/trends*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        points: [
          {
            weekStart: "2026-01-26",
            weekEnd: "2026-02-01",
            totalItems: 3,
            correctItems: 2,
            accuracyPct: 66.7,
            masteryScorePct: 65,
          },
        ],
      }),
    });
  });

  await page.goto("/login");

  await page.getByLabel("이메일").fill(guardianEmail);
  await page.getByLabel("비밀번호").fill(guardianPassword);
  await page.getByRole("button", { name: "로그인" }).click();

  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("heading", { name: "보호자 대시보드" })).toBeVisible();
});
