import { SignJWT } from "jose";
import { expect, test, type Page } from "@playwright/test";

const jwtSecret = process.env.JWT_SECRET ?? "dev_secret_32_characters_minimum_123";
const appOrigin = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";
const testNode = {
  id: "node-authoring-e2e-1",
  curriculumVersion: "2026.03",
  unitCode: "M1-S1-U3",
  unitName: "문자의 사용과 식",
  sortOrder: 3,
};
const now = "2026-03-14T10:00:00.000Z";

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

async function setAuthCookie(page: Page, token: string) {
  await page.context().addCookies([
    {
      name: "study_auth_token",
      value: token,
      url: appOrigin,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

function normalizeSkillTags(skillTags: string[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const tag of skillTags) {
    const nextTag = tag.trim().toLowerCase();

    if (!nextTag || seen.has(nextTag)) {
      continue;
    }

    seen.add(nextTag);
    normalized.push(nextTag);
  }

  return normalized;
}

test("guardian authors study content, student uses it, and used practice sets lock editing", async ({ page }) => {
  const [guardianToken, studentToken] = await Promise.all([
    createAuthToken({
      sub: "guardian-study-content-e2e",
      role: "guardian",
      loginId: "guardian@example.com",
      name: "보호자 E2E",
      email: "guardian@example.com",
    }),
    createAuthToken({
      sub: "student-study-content-e2e",
      role: "student",
      loginId: "student-study-content-e2e",
      name: "학생 E2E",
      studentId: "student-study-content-e2e",
    }),
  ]);

  const state = {
    practiceSet: null as
      | null
      | {
          id: string;
          title: string;
          description: string | null;
          curriculumNodeId: string;
          sortOrder: number;
          isActive: boolean;
          isUsed: boolean;
          attemptCount: number;
          updatedAt: string;
          problems: Array<{
            id: string;
            problemNo: number;
            type: "short_answer" | "single_choice";
            prompt: string;
            choices: string[] | null;
            correctAnswer: string;
            explanation: string | null;
            difficulty: number;
            skillTags: string[];
          }>;
        },
    conceptLesson: null as
      | null
      | {
          id: string;
          curriculumNodeId: string;
          title: string;
          summary: string | null;
          updatedAt: string;
          content: {
            blocks: Array<{ type: "headline"; text: string }>;
          };
        },
    submittedSessions: [] as Array<{
      id: string;
      startedAt: string;
      submittedAt: string;
      elapsedSeconds: number;
      practiceSet: {
        id: string;
        title: string;
        unitName: string;
      };
      result: {
        totalProblems: number;
        correctItems: number;
        wrongItems: number;
      };
      review: null;
      workArtifact: null;
    }>,
  };

  function buildContentResponse() {
    return {
      curriculumVersion: "2026.03",
      curriculumNodes: [testNode],
      practiceSets: state.practiceSet
        ? [
            {
              id: state.practiceSet.id,
              title: state.practiceSet.title,
              description: state.practiceSet.description,
              schoolLevel: "middle",
              grade: 1,
              semester: 1,
              curriculumNodeId: state.practiceSet.curriculumNodeId,
              unitName: testNode.unitName,
              sortOrder: state.practiceSet.sortOrder,
              isActive: state.practiceSet.isActive,
              isUsed: state.practiceSet.isUsed,
              attemptCount: state.practiceSet.attemptCount,
              problemCount: state.practiceSet.problems.length,
              problems: state.practiceSet.problems,
              updatedAt: state.practiceSet.updatedAt,
            },
          ]
        : [],
      conceptLessons: state.conceptLesson
        ? [
            {
              id: state.conceptLesson.id,
              curriculumNodeId: state.conceptLesson.curriculumNodeId,
              unitName: testNode.unitName,
              title: state.conceptLesson.title,
              summary: state.conceptLesson.summary,
              content: state.conceptLesson.content,
              updatedAt: state.conceptLesson.updatedAt,
            },
          ]
        : [],
    };
  }

  function buildStudentBoardResponse() {
    const activePracticeSet = state.practiceSet?.isActive ? state.practiceSet : null;

    return {
      student: {
        id: "student-study-content-e2e",
        name: "학생 E2E",
        schoolLevel: "middle",
        grade: 1,
      },
      dailyMission: activePracticeSet
        ? {
            practiceSetId: activePracticeSet.id,
            title: activePracticeSet.title,
            unitName: testNode.unitName,
            problemCount: activePracticeSet.problems.length,
            progressStatus: state.practiceSet?.isUsed ? "completed" : "planned",
            reason: state.practiceSet?.isUsed
              ? "완료 단원 중 가장 앞선 세트를 복습용으로 제안합니다."
              : "아직 시작하지 않은 단원을 오늘의 첫 학습으로 제안합니다.",
          }
        : null,
      practiceSets: activePracticeSet
        ? [
            {
              id: activePracticeSet.id,
              title: activePracticeSet.title,
              description: activePracticeSet.description,
              curriculumNodeId: activePracticeSet.curriculumNodeId,
              unitName: testNode.unitName,
              problemCount: activePracticeSet.problems.length,
              progressStatus: state.practiceSet?.isUsed ? "completed" : "planned",
              skillTags: [...new Set(activePracticeSet.problems.flatMap((problem) => problem.skillTags))],
            },
          ]
        : [],
      progressSummary: {
        planned: state.practiceSet?.isUsed ? 0 : 1,
        in_progress: 0,
        review_needed: 0,
        completed: state.practiceSet?.isUsed ? 1 : 0,
      },
      progress: [
        {
          curriculumNodeId: testNode.id,
          unitName: testNode.unitName,
          status: state.practiceSet?.isUsed ? "completed" : "planned",
          note: null,
          lastStudiedAt: state.practiceSet?.isUsed ? now : null,
          reviewedAt: null,
          hasConcept: Boolean(state.conceptLesson),
          practiceSetId: activePracticeSet?.id ?? null,
          practiceSetTitle: activePracticeSet?.title ?? null,
        },
      ],
      recentSessions: state.submittedSessions,
      latestFeedback: [],
    };
  }

  await page.route("**/api/v1/study/content?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildContentResponse()),
    });
  });

  await page.route("**/api/v1/study/content/practice-sets", async (route) => {
    const payload = (await route.request().postDataJSON()) as {
      title: string;
      description: string | null;
      curriculumNodeId: string;
      sortOrder: number;
      isActive: boolean;
      problems: Array<{
        problemNo: number;
        type: "short_answer" | "single_choice";
        prompt: string;
        choices: string[] | null;
        correctAnswer: string;
        explanation: string | null;
        skillTags: string[];
        difficulty: number;
      }>;
    };

    state.practiceSet = {
      id: "practice-set-authoring-e2e-1",
      title: payload.title,
      description: payload.description,
      curriculumNodeId: payload.curriculumNodeId,
      sortOrder: payload.sortOrder,
      isActive: payload.isActive,
      isUsed: false,
      attemptCount: 0,
      updatedAt: now,
      problems: payload.problems.map((problem, index) => ({
        id: `practice-problem-e2e-${index + 1}`,
        problemNo: problem.problemNo,
        type: problem.type,
        prompt: problem.prompt,
        choices: problem.choices,
        correctAnswer: problem.correctAnswer,
        explanation: problem.explanation,
        difficulty: problem.difficulty,
        skillTags: normalizeSkillTags(problem.skillTags),
      })),
    };

    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        practiceSet: {
          ...buildContentResponse().practiceSets[0],
        },
      }),
    });
  });

  await page.route("**/api/v1/study/content/concepts/*", async (route) => {
    if (route.request().method() === "DELETE") {
      state.conceptLesson = null;
      await route.fulfill({
        status: 204,
        body: "",
      });
      return;
    }

    const payload = (await route.request().postDataJSON()) as {
      title: string;
      summary: string | null;
      content: {
        blocks: Array<{ type: "headline"; text: string }>;
      };
    };

    state.conceptLesson = {
      id: "concept-lesson-e2e-1",
      curriculumNodeId: testNode.id,
      title: payload.title,
      summary: payload.summary,
      updatedAt: now,
      content: payload.content,
    };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        conceptLesson: {
          id: state.conceptLesson.id,
          curriculumNodeId: state.conceptLesson.curriculumNodeId,
          unitName: testNode.unitName,
          title: state.conceptLesson.title,
          summary: state.conceptLesson.summary,
          content: state.conceptLesson.content,
          updatedAt: state.conceptLesson.updatedAt,
        },
      }),
    });
  });

  await page.route("**/api/v1/student/study/board", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildStudentBoardResponse()),
    });
  });

  await page.route("**/api/v1/student/study/concepts/*", async (route) => {
    if (!state.conceptLesson) {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "NOT_FOUND",
            message: "Concept lesson not found",
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        lesson: {
          curriculumNodeId: testNode.id,
          unitName: testNode.unitName,
          title: state.conceptLesson.title,
          summary: state.conceptLesson.summary,
          content: state.conceptLesson.content,
        },
        recommendedPracticeSet: state.practiceSet?.isActive
          ? {
              id: state.practiceSet.id,
              title: state.practiceSet.title,
              problemCount: state.practiceSet.problems.length,
            }
          : null,
      }),
    });
  });

  await page.route("**/api/v1/student/study/sessions", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          sessions: state.submittedSessions,
        }),
      });
      return;
    }

    if (!state.practiceSet) {
      throw new Error("Practice set must exist before starting a session.");
    }

    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        session: {
          id: "study-session-authoring-e2e-1",
          startedAt: now,
          practiceSet: {
            id: state.practiceSet.id,
            title: state.practiceSet.title,
            description: state.practiceSet.description,
            unitName: testNode.unitName,
            problems: state.practiceSet.problems.map((problem) => ({
              id: problem.id,
              problemNo: problem.problemNo,
              type: problem.type,
              prompt: problem.prompt,
              choices: problem.choices,
              explanation: problem.explanation,
              difficulty: problem.difficulty,
              skillTags: problem.skillTags,
            })),
          },
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
    if (!state.practiceSet) {
      throw new Error("Practice set must exist before submitting a session.");
    }

    state.practiceSet = {
      ...state.practiceSet,
      isUsed: true,
      attemptCount: 1,
      updatedAt: "2026-03-14T10:12:00.000Z",
    };
    state.submittedSessions = [
      {
        id: "study-session-authoring-e2e-1",
        startedAt: now,
        submittedAt: "2026-03-14T10:12:00.000Z",
        elapsedSeconds: 720,
        practiceSet: {
          id: state.practiceSet.id,
          title: state.practiceSet.title,
          unitName: testNode.unitName,
        },
        result: {
          totalProblems: state.practiceSet.problems.length,
          correctItems: state.practiceSet.problems.length,
          wrongItems: 0,
        },
        review: null,
        workArtifact: null,
      },
    ];

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        session: state.submittedSessions[0],
        result: {
          totalProblems: state.practiceSet.problems.length,
          correctItems: state.practiceSet.problems.length,
          wrongItems: 0,
          progressStatus: "completed",
        },
      }),
    });
  });

  await setAuthCookie(page, guardianToken);
  await page.goto("/study/content");

  await expect(page.getByRole("heading", { name: "학습 콘텐츠" })).toBeVisible();
  await page.getByLabel("세트 제목").fill("문자 계산 워밍업");
  await page.getByLabel("설명").first().fill("같은 문자를 합치는 기본 훈련");
  await page.getByLabel("문항 본문").fill("a + a = ?");
  await page.getByLabel("정답").fill("2a");
  await page.getByLabel("Skill Tags (쉼표 구분)").fill(" algebra , Algebra, combine_like_terms ");
  await page.getByRole("button", { name: "연습 세트 생성" }).click();

  await expect(page.getByText("연습 세트를 만들었습니다.")).toBeVisible();
  await expect(page.getByRole("button", { name: /문자 계산 워밍업/ })).toBeVisible();

  await page.getByRole("button", { name: "개념 자료" }).click();
  await page.getByLabel("제목").fill("문자와 식 기본 흐름");
  await page.getByLabel("요약").fill("같은 문자를 묶는 규칙을 먼저 익힙니다.");
  await page.getByLabel("텍스트").fill("같은 문자는 계수만 더해 간단히 정리합니다.");
  await page.getByRole("button", { name: "개념 자료 생성" }).click();

  await expect(page.getByText("개념 자료를 만들었습니다.")).toBeVisible();
  await expect(page.getByRole("button", { name: /문자의 사용과 식/ })).toBeVisible();

  await setAuthCookie(page, studentToken);
  await page.goto("/student/progress");

  await expect(page.getByRole("heading", { name: "단원 상태와 개념 자료를 한 화면에서 봅니다" })).toBeVisible();
  await expect(page.getByText("개념 자료 있음")).toBeVisible();
  await expect(page.getByRole("heading", { name: "문자와 식 기본 흐름" })).toBeVisible();
  await expect(page.getByText("같은 문자는 계수만 더해 간단히 정리합니다.")).toBeVisible();

  await page.goto("/student/study/session?practiceSetId=practice-set-authoring-e2e-1");

  await expect(page.getByText("문자 계산 워밍업 세션을 시작했습니다.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "문자 계산 워밍업", level: 3 })).toBeVisible();
  await page.getByLabel("답 입력").fill("2a");
  await page.getByRole("button", { name: "세션 제출" }).click();

  await expect(page.getByText("세션을 제출했습니다. 보호자 피드백을 기다리는 중입니다.")).toBeVisible();

  await setAuthCookie(page, guardianToken);
  await page.goto("/study/content");
  await page.getByRole("button", { name: /문자 계산 워밍업/ }).click();

  await expect(page.getByText("사용됨 1회")).toBeVisible();
  await expect(
    page.getByText("이 세트는 이미 학생 학습에 사용되었습니다. 문제 구조와 단원 연결은 잠기고, 메타데이터만 수정할 수 있습니다."),
  ).toBeVisible();
});
