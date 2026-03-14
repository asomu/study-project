import { SignJWT } from "jose";
import { expect, test } from "@playwright/test";

const guardianEmail = process.env.SEED_GUARDIAN_EMAIL ?? "guardian@example.com";
const guardianPassword = process.env.SEED_GUARDIAN_PASSWORD ?? "Guardian123!";
const jwtSecret = process.env.JWT_SECRET ?? "dev_secret_32_characters_minimum_123";
const appOrigin = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";

async function createAuthToken() {
  return new SignJWT({
    role: "guardian",
    email: guardianEmail,
    loginId: guardianEmail,
    name: "기본 보호자",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("guardian-e2e")
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(jwtSecret));
}

test("guardian dashboard shows study insight and keeps student preselected in review queue", async ({ page }) => {
  const token = await createAuthToken();

  await page.route("**/api/v1/auth/login", async (route) => {
    await page.context().addCookies([
      {
        name: "study_auth_token",
        value: token,
        url: new URL(route.request().url()).origin,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);

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
          loginId: guardianEmail,
          name: "기본 보호자",
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
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        progress: {
          recommendedPct: 33.3,
          actualPct: 60,
          coveredUnits: 3,
          totalUnits: 5,
        },
        mastery: {
          overallScorePct: 74.2,
          recentAccuracyPct: 70,
          difficultyWeightedAccuracyPct: 72.5,
        },
        summary: {
          totalAttempts: 4,
          totalItems: 12,
          wrongAnswers: 3,
          asOfDate: "2026-03-15",
        },
      }),
    });
  });

  await page.route("**/api/v1/dashboard/weakness*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        weakUnits: [
          {
            curriculumNodeId: "unit-1",
            unitName: "소인수분해",
            attempts: 4,
            accuracyPct: 25,
            wrongCount: 3,
          },
        ],
        categoryDistribution: [{ key: "calculation_mistake", labelKo: "단순 연산 실수", count: 2, ratio: 66.7 }],
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
            weekStart: "2026-03-01",
            weekEnd: "2026-03-07",
            totalItems: 6,
            correctItems: 4,
            accuracyPct: 66.7,
            masteryScorePct: 68.2,
          },
          {
            weekStart: "2026-03-08",
            weekEnd: "2026-03-14",
            totalItems: 6,
            correctItems: 5,
            accuracyPct: 83.3,
            masteryScorePct: 82.4,
          },
        ],
      }),
    });
  });

  await page.route("**/api/v1/dashboard/study-overview*", async (route) => {
    const requestUrl = new URL(route.request().url());
    const studentId = requestUrl.searchParams.get("studentId");

    if (studentId === "student-e2e-2") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          student: {
            id: "student-e2e-2",
            name: "데이터 없음 학생",
            schoolLevel: "middle",
            grade: 1,
          },
          summary: {
            pendingReviews: 0,
            reviewNeededUnits: 0,
            inProgressUnits: 0,
            recentStudyMinutes7d: 0,
            submittedSessions7d: 0,
          },
          progressSummary: {
            planned: 0,
            in_progress: 0,
            review_needed: 0,
            completed: 0,
          },
          recommendedActions: [],
          reviewQueuePreview: [],
          attentionUnits: [],
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        student: {
          id: "student-e2e-1",
          name: "학습 데이터 학생",
          schoolLevel: "middle",
          grade: 1,
        },
        summary: {
          pendingReviews: 1,
          reviewNeededUnits: 2,
          inProgressUnits: 1,
          recentStudyMinutes7d: 42,
          submittedSessions7d: 2,
        },
        progressSummary: {
          planned: 3,
          in_progress: 1,
          review_needed: 2,
          completed: 1,
        },
        recommendedActions: [
          {
            kind: "pending_review_session",
            title: "소인수분해 1 리뷰 대기",
            description: "소인수분해 제출이 아직 검토되지 않았습니다. 보호자 피드백을 남겨 주세요.",
            href: "/study/reviews?studentId=student-e2e-1",
            sessionId: "session-1",
            curriculumNodeId: "unit-1",
            practiceSetId: "practice-1",
          },
        ],
        reviewQueuePreview: [
          {
            attemptId: "session-1",
            submittedAt: "2026-03-14T09:00:00.000Z",
            elapsedSeconds: 185,
            wrongItems: 2,
            hasReview: false,
            practiceSetTitle: "소인수분해 1",
            unitName: "소인수분해",
          },
        ],
        attentionUnits: [
          {
            curriculumNodeId: "unit-1",
            unitName: "소인수분해",
            status: "review_needed",
            lastStudiedAt: "2026-03-14T09:00:00.000Z",
            reviewedAt: null,
            hasConcept: true,
            practiceSetId: "practice-1",
            practiceSetTitle: "소인수분해 1",
          },
        ],
      }),
    });
  });

  await page.route("**/api/v1/study/reviews*", async (route) => {
    const requestUrl = new URL(route.request().url());
    const studentId = requestUrl.searchParams.get("studentId");

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        student: {
          id: studentId,
          name: studentId === "student-e2e-1" ? "학습 데이터 학생" : "데이터 없음 학생",
          schoolLevel: "middle",
          grade: 1,
        },
        reviewQueue:
          studentId === "student-e2e-1"
            ? [
                {
                  id: "session-1",
                  submittedAt: "2026-03-14T09:00:00.000Z",
                  elapsedSeconds: 185,
                  practiceSet: {
                    id: "practice-1",
                    title: "소인수분해 1",
                    unitName: "소인수분해",
                  },
                  result: {
                    totalProblems: 5,
                    correctItems: 3,
                    wrongItems: 2,
                  },
                  review: null,
                  workArtifact: null,
                },
              ]
            : [],
      }),
    });
  });

  await page.route("**/api/v1/study/progress*", async (route) => {
    const requestUrl = new URL(route.request().url());
    const studentId = requestUrl.searchParams.get("studentId");

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        summary:
          studentId === "student-e2e-1"
            ? {
                planned: 3,
                in_progress: 1,
                review_needed: 2,
                completed: 1,
              }
            : {
                planned: 0,
                in_progress: 0,
                review_needed: 0,
                completed: 0,
              },
      }),
    });
  });

  await page.goto("/login");
  await page.getByLabel("이메일 또는 아이디").fill(guardianEmail);
  await page.getByLabel("비밀번호").fill(guardianPassword);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.context().addCookies([
    {
      name: "study_auth_token",
      value: token,
      url: appOrigin,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/dashboard?studentId=student-e2e-1");

  await expect(page.getByText("Study Insight")).toBeVisible();
  await expect(page.getByText("소인수분해 1 리뷰 대기")).toBeVisible();
  await expect(page.getByText("42분")).toBeVisible();
  await expect(page.getByText("소인수분해", { exact: true }).first()).toBeVisible();

  await page.getByRole("link", { name: "소인수분해 1 리뷰 대기" }).click();
  await expect(page).toHaveURL(/\/study\/reviews\?studentId=student-e2e-1/);
  await expect(page.getByLabel("학생 선택")).toHaveValue("student-e2e-1");
  await expect(page.getByText("소인수분해 1")).toBeVisible();
});
