import { SignJWT } from "jose";
import { expect, test } from "@playwright/test";

const jwtSecret = process.env.JWT_SECRET ?? "dev_secret_32_characters_minimum_123";
const appOrigin = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";

const studentCookie = {
  name: "study_auth_token",
  url: appOrigin,
  httpOnly: true as const,
  sameSite: "Lax" as const,
};

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

function buildProgressSummary(status: "planned" | "review_needed" | "completed") {
  return {
    planned: status === "planned" ? 1 : 0,
    in_progress: 0,
    review_needed: status === "review_needed" ? 1 : 0,
    completed: status === "completed" ? 1 : 0,
  };
}

test("student study loop flows into guardian review and back to student dashboard", async ({ page }) => {
  const [studentToken, guardianToken] = await Promise.all([
    createAuthToken({
      sub: "student-user-e2e",
      role: "student",
      loginId: "student-e2e",
      name: "학생 E2E",
      studentId: "student-e2e-1",
    }),
    createAuthToken({
      sub: "guardian-e2e",
      role: "guardian",
      loginId: "guardian@example.com",
      name: "보호자 E2E",
      email: "guardian@example.com",
    }),
  ]);

  const state = {
    progressStatus: "planned" as "planned" | "review_needed" | "completed",
    progressNote: null as string | null,
    lastStudiedAt: null as string | null,
    reviewedAt: null as string | null,
    latestFeedback: [] as Array<{
      attemptId: string;
      practiceSetTitle: string;
      unitName: string | null;
      feedback: string;
      progressStatus: "planned" | "review_needed" | "completed" | null;
      reviewedAt: string | null;
    }>,
    wrongAnswers: [] as Array<{
      id: string;
      memo: string | null;
      imagePath: string | null;
      categories: Array<{ key: string; labelKo: string }>;
      attemptItem: { problemNo: number; attemptDate: string };
    }>,
    sessionSummary: null as null | {
      id: string;
      startedAt: string | null;
      submittedAt: string | null;
      elapsedSeconds: number | null;
      practiceSet: {
        id: string;
        title: string;
        unitName: string;
      } | null;
      result: {
        totalProblems: number;
        correctItems: number;
        wrongItems: number;
      };
      review: {
        feedback: string;
        progressStatus: "planned" | "review_needed" | "completed";
        reviewedAt: string;
      } | null;
      workArtifact: null;
    },
  };

  const practiceSet = {
    id: "practice-set-e2e-1",
    title: "소인수분해 워밍업",
    description: "기초 연산 실수를 줄이는 내장 학습 세트",
    curriculumNodeId: "node-e2e-1",
    unitName: "소인수분해",
    problemCount: 2,
    progressStatus: state.progressStatus,
    skillTags: ["곱셈", "소수"],
  };

  const sessionPayload = {
    id: "study-session-e2e-1",
    startedAt: "2026-03-08T09:00:00.000Z",
    practiceSet: {
      id: practiceSet.id,
      title: practiceSet.title,
      description: practiceSet.description,
      curriculumNodeId: practiceSet.curriculumNodeId,
      unitName: practiceSet.unitName,
      problems: [
        {
          id: "problem-e2e-1",
          problemNo: 1,
          type: "single_choice" as const,
          prompt: "18을 소인수분해한 것으로 알맞은 것은?",
          choices: ["2 x 3 x 3", "2 x 9", "3 x 6", "1 x 18"],
          explanation: "소수의 곱으로만 써야 합니다.",
          difficulty: 2,
          skillTags: ["소인수분해"],
        },
        {
          id: "problem-e2e-2",
          problemNo: 2,
          type: "short_answer" as const,
          prompt: "12의 약수를 모두 적어보세요.",
          choices: null,
          explanation: "1, 2, 3, 4, 6, 12",
          difficulty: 1,
          skillTags: ["약수 찾기"],
        },
      ],
    },
  };

  function buildBoardResponse() {
    return {
      student: {
        id: "student-e2e-1",
        name: "학생 E2E",
        schoolLevel: "middle",
        grade: 1,
      },
      dailyMission: {
        practiceSetId: practiceSet.id,
        title: practiceSet.title,
        unitName: practiceSet.unitName,
        problemCount: practiceSet.problemCount,
        progressStatus: state.progressStatus,
        reason: "최근 리뷰가 필요한 단원을 먼저 복습합니다.",
      },
      practiceSets: [
        {
          ...practiceSet,
          progressStatus: state.progressStatus,
        },
      ],
      progressSummary: buildProgressSummary(state.progressStatus),
      progress: [
        {
          curriculumNodeId: practiceSet.curriculumNodeId,
          unitName: practiceSet.unitName,
          status: state.progressStatus,
          note: state.progressNote,
          lastStudiedAt: state.lastStudiedAt,
          reviewedAt: state.reviewedAt,
          hasConcept: true,
          practiceSetId: practiceSet.id,
          practiceSetTitle: practiceSet.title,
        },
      ],
      recentSessions: state.sessionSummary ? [state.sessionSummary] : [],
      latestFeedback: state.latestFeedback,
    };
  }

  await page.route("**/api/v1/student/study/board", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildBoardResponse()),
    });
  });

  await page.route("**/api/v1/student/study/concepts/*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        lesson: {
          curriculumNodeId: practiceSet.curriculumNodeId,
          unitName: practiceSet.unitName,
          title: "소인수분해 기본 원리",
          summary: "작은 소수부터 나누는 습관을 익힙니다.",
          content: {
            blocks: [
              {
                type: "headline",
                text: "1보다 큰 자연수는 소수의 곱으로 나타낼 수 있습니다.",
              },
              {
                type: "steps",
                items: ["2부터 나누기", "같은 소수로 한 번 더 확인하기", "소수의 곱으로 정리하기"],
              },
            ],
          },
        },
        recommendedPracticeSet: {
          id: practiceSet.id,
          title: practiceSet.title,
          problemCount: practiceSet.problemCount,
        },
      }),
    });
  });

  await page.route("**/api/v1/student/study/sessions", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          sessions: state.sessionSummary ? [state.sessionSummary] : [],
        }),
      });
      return;
    }

    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        session: {
          id: sessionPayload.id,
          startedAt: sessionPayload.startedAt,
          submittedAt: null,
          elapsedSeconds: null,
          practiceSet: sessionPayload.practiceSet,
          result: {
            totalProblems: 0,
            correctItems: 0,
            wrongItems: 0,
          },
          review: null,
          workArtifact: null,
        },
      }),
    });
  });

  await page.route("**/api/v1/student/study/sessions/*/submit", async (route) => {
    const now = "2026-03-08T09:12:00.000Z";

    state.progressStatus = "review_needed";
    state.lastStudiedAt = now;
    state.sessionSummary = {
      id: sessionPayload.id,
      startedAt: sessionPayload.startedAt,
      submittedAt: now,
      elapsedSeconds: 720,
      practiceSet: {
        id: practiceSet.id,
        title: practiceSet.title,
        unitName: practiceSet.unitName,
      },
      result: {
        totalProblems: 2,
        correctItems: 1,
        wrongItems: 1,
      },
      review: null,
      workArtifact: null,
    };
    state.wrongAnswers = [
      {
        id: "wrong-answer-e2e-1",
        memo: null,
        imagePath: null,
        categories: [],
        attemptItem: {
          problemNo: 1,
          attemptDate: now,
        },
      },
    ];

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        session: state.sessionSummary,
        result: {
          totalProblems: 2,
          correctItems: 1,
          wrongItems: 1,
          progressStatus: "review_needed",
        },
      }),
    });
  });

  await page.route("**/api/v1/student/wrong-answers", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        wrongAnswers: state.wrongAnswers,
      }),
    });
  });

  await page.route("**/api/v1/student/wrong-answers/*", async (route) => {
    if (route.request().method() !== "PUT") {
      await route.fallback();
      return;
    }

    const payload = (await route.request().postDataJSON()) as {
      memo?: string;
      categoryKeys?: string[];
    };
    const wrongAnswer = state.wrongAnswers[0];

    wrongAnswer.memo = payload.memo?.trim() || null;
    wrongAnswer.categories = (payload.categoryKeys ?? []).map((key) => ({
      key,
      labelKo:
        key === "calculation_mistake" ? "단순 연산 실수" : key === "misread_question" ? "문제 잘못 읽음" : "문제 이해 못함",
    }));

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(wrongAnswer),
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
            name: "학생 E2E",
            schoolLevel: "middle",
            grade: 1,
          },
        ],
      }),
    });
  });

  await page.route("**/api/v1/study/reviews?studentId=*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        reviewQueue: state.sessionSummary ? [state.sessionSummary] : [],
      }),
    });
  });

  await page.route("**/api/v1/study/progress?studentId=*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        summary: buildProgressSummary(state.progressStatus),
        progress: [
          {
            curriculumNodeId: practiceSet.curriculumNodeId,
            unitName: practiceSet.unitName,
            status: state.progressStatus,
            note: state.progressNote,
            lastStudiedAt: state.lastStudiedAt,
            reviewedAt: state.reviewedAt,
            hasConcept: true,
            practiceSetId: practiceSet.id,
            practiceSetTitle: practiceSet.title,
          },
        ],
      }),
    });
  });

  await page.route("**/api/v1/study/reviews/*", async (route) => {
    const payload = (await route.request().postDataJSON()) as {
      feedback: string;
      progressStatus: "planned" | "review_needed" | "completed";
    };
    const reviewedAt = "2026-03-08T09:30:00.000Z";

    state.progressStatus = payload.progressStatus;
    state.progressNote = payload.feedback;
    state.reviewedAt = reviewedAt;
    state.latestFeedback = [
      {
        attemptId: sessionPayload.id,
        practiceSetTitle: practiceSet.title,
        unitName: practiceSet.unitName,
        feedback: payload.feedback,
        progressStatus: payload.progressStatus,
        reviewedAt,
      },
    ];

    if (state.sessionSummary) {
      state.sessionSummary.review = {
        feedback: payload.feedback,
        progressStatus: payload.progressStatus,
        reviewedAt,
      };
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        review: {
          id: "review-e2e-1",
          feedback: payload.feedback,
          progressStatus: payload.progressStatus,
          reviewedAt,
        },
      }),
    });
  });

  await page.route("**/api/v1/student/dashboard/overview", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        student: {
          id: "student-e2e-1",
          name: "학생 E2E",
          schoolLevel: "middle",
          grade: 1,
        },
        today: {
          date: "2026-03-08",
          totalItems: state.sessionSummary?.result.totalProblems ?? 0,
          correctItems: state.sessionSummary?.result.correctItems ?? 0,
          accuracyPct: state.sessionSummary ? 50 : 0,
        },
        recent7Days: {
          totalItems: state.sessionSummary?.result.totalProblems ?? 0,
          correctItems: state.sessionSummary?.result.correctItems ?? 0,
          accuracyPct: state.sessionSummary ? 50 : 0,
        },
        focus: {
          weakUnits: state.sessionSummary
            ? [
                {
                  curriculumNodeId: practiceSet.curriculumNodeId,
                  unitName: practiceSet.unitName,
                  attempts: 2,
                  accuracyPct: 50,
                  wrongCount: 1,
                },
              ]
            : [],
        },
        review: {
          recentWrongAnswers: state.wrongAnswers,
        },
        summary: {
          totalAttempts: state.sessionSummary ? 1 : 0,
          totalItems: state.sessionSummary?.result.totalProblems ?? 0,
          hasData: Boolean(state.sessionSummary),
        },
        nextAction: {
          label: "오답 검토 이어가기",
          description: "학생이 다시 정리한 오답과 보호자 피드백을 함께 확인합니다.",
        },
      }),
    });
  });

  await page.route("**/api/v1/student/dashboard/trends", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        points: state.sessionSummary
          ? [
              {
                weekStart: "2026-03-02",
                weekEnd: "2026-03-08",
                totalItems: 2,
                correctItems: 1,
                accuracyPct: 50,
                masteryScorePct: 52,
              },
            ]
          : [],
      }),
    });
  });

  await page.context().addCookies([
    {
      ...studentCookie,
      value: studentToken,
    },
  ]);

  await page.goto("/student/progress");
  await expect(page.getByRole("heading", { name: "단원 상태와 개념 자료를 한 화면에서 봅니다" })).toBeVisible();
  await expect(page.getByText("소인수분해 기본 원리")).toBeVisible();
  await page.getByRole("link", { name: "이 세트로 학습 시작" }).click();

  await expect(page.getByText("18을 소인수분해한 것으로 알맞은 것은?")).toBeVisible();
  await page.getByLabel("2 x 9").check();
  await page.getByLabel("답 입력").fill("1, 2, 3, 4, 6, 12");

  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();

  if (!box) {
    throw new Error("Canvas bounding box unavailable");
  }

  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + 120, box.y + 70);
  await page.mouse.up();

  await page.getByRole("button", { name: "세션 제출" }).click();
  await expect(page.getByText("보호자 피드백을 기다리는 중입니다.")).toBeVisible();
  await expect(page.getByText("최근 제출 결과")).toBeVisible();

  await page.goto("/student/wrong-answers");
  await expect(page.getByText("문항 1")).toBeVisible();
  await page.getByLabel("내 생각 메모").fill("마지막에 소수의 곱인지 확인하지 못했다.");
  await page.getByLabel("단순 연산 실수 (calculation_mistake)").check();
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByText("학생 오답노트를 저장했습니다.")).toBeVisible();

  await page.context().addCookies([
    {
      ...studentCookie,
      value: guardianToken,
    },
  ]);

  await page.goto("/study/reviews");
  await expect(page.getByRole("heading", { name: "학생이 제출한 학습 세션을 검토합니다" })).toBeVisible();
  await page.getByLabel("피드백").fill("검산 한 번만 더 하면 바로 완료로 올릴 수 있어요.");
  await page.getByLabel("리뷰 후 단원 상태").selectOption("completed");
  await page.getByRole("button", { name: "리뷰 저장" }).click();
  await expect(page.getByText("학습 리뷰를 저장했습니다.")).toBeVisible();

  await page.context().addCookies([
    {
      ...studentCookie,
      value: studentToken,
    },
  ]);

  await page.goto("/student/dashboard");
  await expect(page.getByRole("heading", { name: "학생 E2E 학생, 오늘은 2문항을 확인했습니다." })).toBeVisible();
  await expect(page.getByText("검산 한 번만 더 하면 바로 완료로 올릴 수 있어요.")).toBeVisible();
});
