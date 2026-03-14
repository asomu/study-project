import { Buffer } from "node:buffer";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PracticeProblemType, StudyProgressStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GET as GET_GUARDIAN_PROGRESS } from "@/app/api/v1/study/progress/route";
import { POST as POST_GUARDIAN_REVIEW } from "@/app/api/v1/study/reviews/[sessionId]/route";
import { GET as GET_GUARDIAN_REVIEWS } from "@/app/api/v1/study/reviews/route";
import { GET as GET_STUDENT_WRONG_ANSWERS } from "@/app/api/v1/student/wrong-answers/route";
import { POST as POST_STUDENT_WRONG_ANSWER_IMAGE } from "@/app/api/v1/student/wrong-answers/[id]/image/route";
import { PUT as PUT_STUDENT_WRONG_ANSWER } from "@/app/api/v1/student/wrong-answers/[id]/route";
import { GET as GET_STUDENT_BOARD } from "@/app/api/v1/student/study/board/route";
import { POST as POST_STUDENT_STUDY_SESSIONS } from "@/app/api/v1/student/study/sessions/route";
import { POST as POST_STUDENT_STUDY_SUBMIT } from "@/app/api/v1/student/study/sessions/[id]/submit/route";
import {
  clearTestUploadDirectory,
  createSeedGuardianAuthCookie,
  createSeedStudentAuthCookie,
  getSeedGuardian,
  resetSeedStudentAccountState,
  resetSeedStudentScopedData,
  SEEDED_STUDENT_ID,
} from "./db-test-helpers";

const ONE_BY_ONE_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9pM7tSMAAAAASUVORK5CYII=";
const ONE_BY_ONE_PNG_DATA_URL = `data:image/png;base64,${ONE_BY_ONE_PNG_BASE64}`;

function createJsonRequest(url: string, authCookie: string, method: "POST" | "PUT", body: unknown) {
  return new Request(url, {
    method,
    headers: {
      cookie: authCookie,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("real integration: student study loop", () => {
  beforeAll(async () => {
    await getSeedGuardian();
  });

  beforeEach(async () => {
    await resetSeedStudentScopedData();
    await resetSeedStudentAccountState();
    await clearTestUploadDirectory();
  });

  afterAll(async () => {
    await resetSeedStudentScopedData();
    await resetSeedStudentAccountState();
    await clearTestUploadDirectory();
    await prisma.$disconnect();
  });

  it("runs practice submission, wrong-answer update, guardian review, and synced progress boards", async () => {
    const [studentAuthCookie, guardianAuthCookie] = await Promise.all([
      createSeedStudentAuthCookie(),
      createSeedGuardianAuthCookie(),
    ]);

    const initialBoardResponse = await GET_STUDENT_BOARD(
      new Request("http://localhost/api/v1/student/study/board", {
        method: "GET",
        headers: {
          cookie: studentAuthCookie,
        },
      }),
    );
    const initialBoardBody = (await initialBoardResponse.json()) as {
      dailyMission: { practiceSetId: string } | null;
      practiceSets: Array<{ id: string }>;
    };

    expect(initialBoardResponse.status).toBe(200);

    const practiceSetId = initialBoardBody.dailyMission?.practiceSetId ?? initialBoardBody.practiceSets[0]?.id;

    expect(practiceSetId).toBeTruthy();

    const startSessionResponse = await POST_STUDENT_STUDY_SESSIONS(
      createJsonRequest("http://localhost/api/v1/student/study/sessions", studentAuthCookie, "POST", {
        practiceSetId,
      }),
    );
    const startSessionBody = (await startSessionResponse.json()) as {
      session: {
        id: string;
        practiceSet: {
          id: string;
          problems: Array<{ id: string; problemNo: number }>;
        };
      };
    };

    expect(startSessionResponse.status).toBe(201);
    expect(startSessionBody.session.practiceSet.problems.length).toBeGreaterThan(0);

    const practiceProblems = await prisma.practiceProblem.findMany({
      where: {
        practiceSetId: startSessionBody.session.practiceSet.id,
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
        `http://localhost/api/v1/student/study/sessions/${startSessionBody.session.id}/submit`,
        studentAuthCookie,
        "POST",
        {
          elapsedSeconds: 185,
          canvasImageDataUrl: ONE_BY_ONE_PNG_DATA_URL,
          answers,
        },
      ),
      {
        params: Promise.resolve({
          id: startSessionBody.session.id,
        }),
      },
    );
    const submitBody = (await submitResponse.json()) as {
      session: {
        id: string;
        workArtifact: { imagePath: string } | null;
      };
      result: {
        totalProblems: number;
        correctItems: number;
        wrongItems: number;
        progressStatus: StudyProgressStatus;
      };
    };

    expect(submitResponse.status).toBe(200);
    expect(submitBody.result.totalProblems).toBe(practiceProblems.length);
    expect(submitBody.result.wrongItems).toBeGreaterThan(0);
    expect(submitBody.result.progressStatus).toBe(StudyProgressStatus.review_needed);
    expect(submitBody.session.workArtifact?.imagePath).toContain("/uploads/");

    const wrongAnswersResponse = await GET_STUDENT_WRONG_ANSWERS(
      new Request("http://localhost/api/v1/student/wrong-answers", {
        method: "GET",
        headers: {
          cookie: studentAuthCookie,
        },
      }),
    );
    const wrongAnswersBody = (await wrongAnswersResponse.json()) as {
      wrongAnswers: Array<{
        id: string;
        memo: string | null;
        imagePath: string | null;
        categories: Array<{ key: string }>;
      }>;
    };

    expect(wrongAnswersResponse.status).toBe(200);
    expect(wrongAnswersBody.wrongAnswers).toHaveLength(submitBody.result.wrongItems);

    const targetWrongAnswer = wrongAnswersBody.wrongAnswers[0];

    expect(targetWrongAnswer).toBeTruthy();

    const updateWrongAnswerResponse = await PUT_STUDENT_WRONG_ANSWER(
      createJsonRequest(`http://localhost/api/v1/student/wrong-answers/${targetWrongAnswer!.id}`, studentAuthCookie, "PUT", {
        memo: "실수 이유를 다시 정리했습니다.",
        categoryKeys: ["calculation_mistake"],
      }),
      {
        params: Promise.resolve({
          id: targetWrongAnswer!.id,
        }),
      },
    );
    const updateWrongAnswerBody = (await updateWrongAnswerResponse.json()) as {
      memo: string | null;
      categories: Array<{ key: string }>;
    };

    expect(updateWrongAnswerResponse.status).toBe(200);
    expect(updateWrongAnswerBody.memo).toBe("실수 이유를 다시 정리했습니다.");
    expect(updateWrongAnswerBody.categories.map((category) => category.key)).toEqual(["calculation_mistake"]);

    const wrongAnswerImageForm = new FormData();
    wrongAnswerImageForm.set(
      "file",
      new File([Buffer.from(ONE_BY_ONE_PNG_BASE64, "base64")], "wrong-answer.png", {
        type: "image/png",
      }),
    );

    const uploadWrongAnswerImageResponse = await POST_STUDENT_WRONG_ANSWER_IMAGE(
      new Request(`http://localhost/api/v1/student/wrong-answers/${targetWrongAnswer!.id}/image`, {
        method: "POST",
        headers: {
          cookie: studentAuthCookie,
        },
        body: wrongAnswerImageForm,
      }),
      {
        params: Promise.resolve({
          id: targetWrongAnswer!.id,
        }),
      },
    );
    const uploadWrongAnswerImageBody = (await uploadWrongAnswerImageResponse.json()) as {
      imagePath: string;
    };

    expect(uploadWrongAnswerImageResponse.status).toBe(200);
    expect(uploadWrongAnswerImageBody.imagePath).toContain("/uploads/");

    const reviewQueueResponse = await GET_GUARDIAN_REVIEWS(
      new Request(`http://localhost/api/v1/study/reviews?studentId=${SEEDED_STUDENT_ID}`, {
        method: "GET",
        headers: {
          cookie: guardianAuthCookie,
        },
      }),
    );
    const reviewQueueBody = (await reviewQueueResponse.json()) as {
      reviewQueue: Array<{
        id: string;
        result: { wrongItems: number };
        review: null | { feedback: string };
      }>;
    };

    expect(reviewQueueResponse.status).toBe(200);
    expect(reviewQueueBody.reviewQueue).toHaveLength(1);
    expect(reviewQueueBody.reviewQueue[0]?.result.wrongItems).toBe(submitBody.result.wrongItems);

    const reviewResponse = await POST_GUARDIAN_REVIEW(
      createJsonRequest(`http://localhost/api/v1/study/reviews/${startSessionBody.session.id}`, guardianAuthCookie, "POST", {
        feedback: "계산은 맞는 흐름이었고 마지막 검산만 더 해보자.",
        progressStatus: StudyProgressStatus.completed,
      }),
      {
        params: Promise.resolve({
          sessionId: startSessionBody.session.id,
        }),
      },
    );
    const reviewBody = (await reviewResponse.json()) as {
      review: {
        feedback: string;
        progressStatus: StudyProgressStatus;
      };
    };

    expect(reviewResponse.status).toBe(200);
    expect(reviewBody.review.feedback).toContain("검산");
    expect(reviewBody.review.progressStatus).toBe(StudyProgressStatus.completed);

    const guardianProgressResponse = await GET_GUARDIAN_PROGRESS(
      new Request(`http://localhost/api/v1/study/progress?studentId=${SEEDED_STUDENT_ID}`, {
        method: "GET",
        headers: {
          cookie: guardianAuthCookie,
        },
      }),
    );
    const guardianProgressBody = (await guardianProgressResponse.json()) as {
      summary: Record<StudyProgressStatus, number>;
      progress: Array<{
        curriculumNodeId: string;
        status: StudyProgressStatus;
        note: string | null;
      }>;
    };

    expect(guardianProgressResponse.status).toBe(200);
    expect(guardianProgressBody.summary.completed).toBe(1);
    expect(guardianProgressBody.progress.some((item) => item.status === StudyProgressStatus.completed)).toBe(true);
    expect(guardianProgressBody.progress.some((item) => item.note?.includes("검산"))).toBe(true);

    const refreshedBoardResponse = await GET_STUDENT_BOARD(
      new Request("http://localhost/api/v1/student/study/board", {
        method: "GET",
        headers: {
          cookie: studentAuthCookie,
        },
      }),
    );
    const refreshedBoardBody = (await refreshedBoardResponse.json()) as {
      progressSummary: Record<StudyProgressStatus, number>;
      latestFeedback: Array<{
        feedback: string;
        progressStatus: StudyProgressStatus | null;
      }>;
    };

    expect(refreshedBoardResponse.status).toBe(200);
    expect(refreshedBoardBody.progressSummary.completed).toBe(1);
    expect(refreshedBoardBody.latestFeedback[0]?.feedback).toContain("검산");
    expect(refreshedBoardBody.latestFeedback[0]?.progressStatus).toBe(StudyProgressStatus.completed);
  });
});
