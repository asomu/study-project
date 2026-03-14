import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PracticeProblemType, StudyProgressStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GET as GET_DASHBOARD_STUDY_OVERVIEW } from "@/app/api/v1/dashboard/study-overview/route";
import { POST as POST_GUARDIAN_REVIEW } from "@/app/api/v1/study/reviews/[sessionId]/route";
import { GET as GET_STUDENT_BOARD } from "@/app/api/v1/student/study/board/route";
import { POST as POST_STUDENT_STUDY_SESSIONS } from "@/app/api/v1/student/study/sessions/route";
import { POST as POST_STUDENT_STUDY_SUBMIT } from "@/app/api/v1/student/study/sessions/[id]/submit/route";
import {
  createSeedGuardianAuthCookie,
  createSeedStudentAuthCookie,
  getSeedGuardian,
  resetSeedStudentAccountState,
  resetSeedStudentScopedData,
  SEEDED_STUDENT_ID,
} from "./db-test-helpers";

function createJsonRequest(url: string, authCookie: string, method: "POST", body: unknown) {
  return new Request(url, {
    method,
    headers: {
      cookie: authCookie,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function buildDateOnly(daysFromToday = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

describe("real integration: guardian dashboard study overview", () => {
  beforeAll(async () => {
    await getSeedGuardian();
  });

  beforeEach(async () => {
    await resetSeedStudentScopedData();
    await resetSeedStudentAccountState();
  });

  afterAll(async () => {
    await resetSeedStudentScopedData();
    await resetSeedStudentAccountState();
    await prisma.$disconnect();
  });

  it("tracks pending reviews, keeps historical sessions after deactivation, and reflects guardian review updates", async () => {
    const [studentAuthCookie, guardianAuthCookie] = await Promise.all([
      createSeedStudentAuthCookie(),
      createSeedGuardianAuthCookie(),
    ]);

    const boardResponse = await GET_STUDENT_BOARD(
      new Request("http://localhost/api/v1/student/study/board", {
        method: "GET",
        headers: {
          cookie: studentAuthCookie,
        },
      }),
    );
    const boardBody = (await boardResponse.json()) as {
      dailyMission: { practiceSetId: string } | null;
      practiceSets: Array<{ id: string }>;
    };

    expect(boardResponse.status).toBe(200);

    const practiceSetId = boardBody.dailyMission?.practiceSetId ?? boardBody.practiceSets[0]?.id;

    expect(practiceSetId).toBeTruthy();

    const startResponse = await POST_STUDENT_STUDY_SESSIONS(
      createJsonRequest("http://localhost/api/v1/student/study/sessions", studentAuthCookie, "POST", {
        practiceSetId,
      }),
    );
    const startBody = (await startResponse.json()) as {
      session: {
        id: string;
        practiceSet: {
          id: string;
          problems: Array<{ id: string }>;
        };
      };
    };

    expect(startResponse.status).toBe(201);

    const practiceSetSnapshot = await prisma.practiceSet.findUnique({
      where: {
        id: startBody.session.practiceSet.id,
      },
      select: {
        id: true,
        curriculumNodeId: true,
        isActive: true,
      },
    });

    if (!practiceSetSnapshot) {
      throw new Error("Practice set snapshot is required for dashboard study overview test.");
    }

    const practiceProblems = await prisma.practiceProblem.findMany({
      where: {
        practiceSetId: startBody.session.practiceSet.id,
      },
      orderBy: {
        problemNo: "asc",
      },
      select: {
        id: true,
        type: true,
        correctAnswer: true,
        choicesJson: true,
      },
    });

    const answers = practiceProblems.map((problem, index) => {
      if (index === 0) {
        if (problem.type === PracticeProblemType.single_choice && Array.isArray(problem.choicesJson)) {
          const wrongChoice = (problem.choicesJson as string[]).find((choice) => choice !== problem.correctAnswer) ?? "__wrong__";

          return {
            practiceProblemId: problem.id,
            studentAnswer: wrongChoice,
          };
        }

        return {
          practiceProblemId: problem.id,
          studentAnswer: "__wrong__",
        };
      }

      return {
        practiceProblemId: problem.id,
        studentAnswer: problem.correctAnswer,
      };
    });

    const submitResponse = await POST_STUDENT_STUDY_SUBMIT(
      createJsonRequest(
        `http://localhost/api/v1/student/study/sessions/${startBody.session.id}/submit`,
        studentAuthCookie,
        "POST",
        {
          elapsedSeconds: 185,
          answers,
        },
      ),
      {
        params: Promise.resolve({
          id: startBody.session.id,
        }),
      },
    );

    expect(submitResponse.status).toBe(200);

    const asOfDate = buildDateOnly();

    try {
      const overviewBeforeReviewResponse = await GET_DASHBOARD_STUDY_OVERVIEW(
        new Request(`http://localhost/api/v1/dashboard/study-overview?studentId=${SEEDED_STUDENT_ID}&date=${asOfDate}`, {
          method: "GET",
          headers: {
            cookie: guardianAuthCookie,
          },
        }),
      );
      const overviewBeforeReviewBody = (await overviewBeforeReviewResponse.json()) as {
        summary: {
          pendingReviews: number;
          recentStudyMinutes7d: number;
          submittedSessions7d: number;
        };
        progressSummary: Record<StudyProgressStatus, number>;
        recommendedActions: Array<{ kind: string }>;
        reviewQueuePreview: Array<{ attemptId: string }>;
        attentionUnits: Array<{ curriculumNodeId: string; status: StudyProgressStatus }>;
      };

      expect(overviewBeforeReviewResponse.status).toBe(200);
      expect(overviewBeforeReviewBody.summary.pendingReviews).toBe(1);
      expect(overviewBeforeReviewBody.summary.recentStudyMinutes7d).toBe(3);
      expect(overviewBeforeReviewBody.summary.submittedSessions7d).toBe(1);
      expect(overviewBeforeReviewBody.progressSummary.review_needed).toBe(1);
      expect(overviewBeforeReviewBody.recommendedActions[0]?.kind).toBe("pending_review_session");
      expect(overviewBeforeReviewBody.reviewQueuePreview[0]?.attemptId).toBe(startBody.session.id);
      expect(
        overviewBeforeReviewBody.attentionUnits.some(
          (item) => item.curriculumNodeId === practiceSetSnapshot.curriculumNodeId && item.status === StudyProgressStatus.review_needed,
        ),
      ).toBe(true);

      await prisma.practiceSet.update({
        where: {
          id: practiceSetSnapshot.id,
        },
        data: {
          isActive: false,
        },
      });

      const overviewAfterDeactivateResponse = await GET_DASHBOARD_STUDY_OVERVIEW(
        new Request(`http://localhost/api/v1/dashboard/study-overview?studentId=${SEEDED_STUDENT_ID}&date=${asOfDate}`, {
          method: "GET",
          headers: {
            cookie: guardianAuthCookie,
          },
        }),
      );
      const overviewAfterDeactivateBody = (await overviewAfterDeactivateResponse.json()) as {
        reviewQueuePreview: Array<{ attemptId: string }>;
        attentionUnits: Array<{ curriculumNodeId: string }>;
      };

      expect(overviewAfterDeactivateResponse.status).toBe(200);
      expect(overviewAfterDeactivateBody.reviewQueuePreview[0]?.attemptId).toBe(startBody.session.id);
      expect(
        overviewAfterDeactivateBody.attentionUnits.some((item) => item.curriculumNodeId === practiceSetSnapshot.curriculumNodeId),
      ).toBe(true);

      const reviewResponse = await POST_GUARDIAN_REVIEW(
        createJsonRequest(`http://localhost/api/v1/study/reviews/${startBody.session.id}`, guardianAuthCookie, "POST", {
          feedback: "계산 흐름은 맞았고 마지막 검산만 더 해보자.",
          progressStatus: StudyProgressStatus.completed,
        }),
        {
          params: Promise.resolve({
            sessionId: startBody.session.id,
          }),
        },
      );

      expect(reviewResponse.status).toBe(200);

      const overviewAfterReviewResponse = await GET_DASHBOARD_STUDY_OVERVIEW(
        new Request(`http://localhost/api/v1/dashboard/study-overview?studentId=${SEEDED_STUDENT_ID}&date=${asOfDate}`, {
          method: "GET",
          headers: {
            cookie: guardianAuthCookie,
          },
        }),
      );
      const overviewAfterReviewBody = (await overviewAfterReviewResponse.json()) as {
        summary: { pendingReviews: number; reviewNeededUnits: number };
        progressSummary: Record<StudyProgressStatus, number>;
        recommendedActions: Array<{ kind: string }>;
      };

      expect(overviewAfterReviewResponse.status).toBe(200);
      expect(overviewAfterReviewBody.summary.pendingReviews).toBe(0);
      expect(overviewAfterReviewBody.summary.reviewNeededUnits).toBe(0);
      expect(overviewAfterReviewBody.progressSummary.completed).toBe(1);
      expect(overviewAfterReviewBody.recommendedActions.some((item) => item.kind === "pending_review_session")).toBe(false);
    } finally {
      await prisma.practiceSet.update({
        where: {
          id: practiceSetSnapshot.id,
        },
        data: {
          isActive: practiceSetSnapshot.isActive,
        },
      });
    }
  });
});
