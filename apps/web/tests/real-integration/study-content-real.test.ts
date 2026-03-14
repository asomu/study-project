import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PracticeProblemType, StudyProgressStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GET as GET_STUDY_CONTENT } from "@/app/api/v1/study/content/route";
import { PUT as PUT_CONCEPT, DELETE as DELETE_CONCEPT } from "@/app/api/v1/study/content/concepts/[curriculumNodeId]/route";
import { POST as POST_PRACTICE_SET } from "@/app/api/v1/study/content/practice-sets/route";
import { PUT as PUT_PRACTICE_SET } from "@/app/api/v1/study/content/practice-sets/[id]/route";
import { PUT as PUT_PRACTICE_SET_ACTIVATION } from "@/app/api/v1/study/content/practice-sets/[id]/activation/route";
import { GET as GET_STUDENT_BOARD } from "@/app/api/v1/student/study/board/route";
import { GET as GET_STUDENT_CONCEPT } from "@/app/api/v1/student/study/concepts/[curriculumNodeId]/route";
import { POST as POST_STUDENT_STUDY_SESSIONS } from "@/app/api/v1/student/study/sessions/route";
import { POST as POST_STUDENT_STUDY_SUBMIT } from "@/app/api/v1/student/study/sessions/[id]/submit/route";
import {
  createSeedGuardianAuthCookie,
  createSeedStudentAuthCookie,
  getSeedGuardian,
  resetSeedStudentAccountState,
  resetSeedStudentScopedData,
} from "./db-test-helpers";

const TEST_NODE_ID = "44444444-4444-4444-8444-444444444444";
const SEEDED_PRACTICE_SET_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TEST_PRACTICE_SET_TITLE = "[test] M7 문자의 사용과 식";

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

async function cleanupCreatedStudyContent() {
  await prisma.conceptLesson.deleteMany({
    where: {
      curriculumNodeId: TEST_NODE_ID,
    },
  });

  const createdSets = await prisma.practiceSet.findMany({
    where: {
      title: {
        startsWith: TEST_PRACTICE_SET_TITLE,
      },
    },
    select: {
      id: true,
    },
  });

  if (!createdSets.length) {
    return;
  }

  const practiceSetIds = createdSets.map((practiceSet) => practiceSet.id);

  await prisma.practiceProblem.deleteMany({
    where: {
      practiceSetId: {
        in: practiceSetIds,
      },
    },
  });

  await prisma.practiceSet.deleteMany({
    where: {
      id: {
        in: practiceSetIds,
      },
    },
  });
}

describe("real integration: study content authoring", () => {
  let seedPracticeSetSnapshot: {
    title: string;
    description: string | null;
    sortOrder: number;
    isActive: boolean;
  };

  beforeAll(async () => {
    await getSeedGuardian();
  });

  beforeEach(async () => {
    await resetSeedStudentScopedData();
    await resetSeedStudentAccountState();
    await cleanupCreatedStudyContent();

    const seededPracticeSet = await prisma.practiceSet.findUnique({
      where: {
        id: SEEDED_PRACTICE_SET_ID,
      },
      select: {
        title: true,
        description: true,
        sortOrder: true,
        isActive: true,
      },
    });

    if (!seededPracticeSet) {
      throw new Error("Seeded practice set is required for study content tests.");
    }

    seedPracticeSetSnapshot = seededPracticeSet;
  });

  afterAll(async () => {
    await prisma.practiceSet.update({
      where: {
        id: SEEDED_PRACTICE_SET_ID,
      },
      data: seedPracticeSetSnapshot,
    });

    await cleanupCreatedStudyContent();
    await resetSeedStudentScopedData();
    await resetSeedStudentAccountState();
    await prisma.$disconnect();
  });

  it("creates study content that appears on student boards and disappears when deactivated or deleted", async () => {
    const [guardianAuthCookie, studentAuthCookie] = await Promise.all([
      createSeedGuardianAuthCookie(),
      createSeedStudentAuthCookie(),
    ]);

    const createPracticeSetResponse = await POST_PRACTICE_SET(
      createJsonRequest("http://localhost/api/v1/study/content/practice-sets", guardianAuthCookie, "POST", {
        title: TEST_PRACTICE_SET_TITLE,
        description: "문자 계산의 기본 형태를 빠르게 확인하는 세트",
        schoolLevel: "middle",
        grade: 1,
        semester: 1,
        curriculumNodeId: TEST_NODE_ID,
        sortOrder: 0,
        isActive: true,
        problems: [
          {
            problemNo: 1,
            type: PracticeProblemType.short_answer,
            prompt: "a + a = ?",
            choices: null,
            correctAnswer: "2a",
            explanation: "같은 문자를 더하면 계수를 더합니다.",
            skillTags: [" algebra ", "Algebra", "combine_like_terms"],
            difficulty: 2,
          },
        ],
      }),
    );
    const createPracticeSetBody = (await createPracticeSetResponse.json()) as {
      practiceSet: { id: string; title: string; problems: Array<{ skillTags: string[] }> };
    };

    expect(createPracticeSetResponse.status).toBe(201);
    expect(createPracticeSetBody.practiceSet.title).toBe(TEST_PRACTICE_SET_TITLE);
    expect(createPracticeSetBody.practiceSet.problems[0]?.skillTags).toEqual(["algebra", "combine_like_terms"]);

    const createConceptResponse = await PUT_CONCEPT(
      createJsonRequest(`http://localhost/api/v1/study/content/concepts/${TEST_NODE_ID}`, guardianAuthCookie, "PUT", {
        title: "[test] 문자와 식 기본 흐름",
        summary: "문자를 수처럼 다루는 첫 규칙을 눈에 보이게 정리합니다.",
        content: {
          blocks: [
            {
              type: "headline",
              text: "같은 문자는 계수만 더해 간단히 정리합니다.",
            },
            {
              type: "visual_hint",
              text: "a 조각 두 개를 한 묶음 2a로 생각해보세요.",
            },
            {
              type: "steps",
              items: ["같은 문자인지 확인한다.", "계수만 더하거나 뺀다."],
            },
            {
              type: "table",
              rows: [
                ["a + a", "2a"],
                ["3x - x", "2x"],
              ],
            },
          ],
        },
      }),
      {
        params: Promise.resolve({
          curriculumNodeId: TEST_NODE_ID,
        }),
      },
    );
    const createConceptBody = (await createConceptResponse.json()) as {
      conceptLesson: { curriculumNodeId: string; title: string };
    };

    expect(createConceptResponse.status).toBe(200);
    expect(createConceptBody.conceptLesson.curriculumNodeId).toBe(TEST_NODE_ID);

    const contentResponse = await GET_STUDY_CONTENT(
      new Request("http://localhost/api/v1/study/content?schoolLevel=middle&grade=1&semester=1", {
        headers: {
          cookie: guardianAuthCookie,
        },
      }),
    );
    const contentBody = (await contentResponse.json()) as {
      practiceSets: Array<{ id: string }>;
      conceptLessons: Array<{ curriculumNodeId: string }>;
    };

    expect(contentResponse.status).toBe(200);
    expect(contentBody.practiceSets.some((practiceSet) => practiceSet.id === createPracticeSetBody.practiceSet.id)).toBe(true);
    expect(contentBody.conceptLessons.some((lesson) => lesson.curriculumNodeId === TEST_NODE_ID)).toBe(true);

    const boardWithCreatedContentResponse = await GET_STUDENT_BOARD(
      new Request("http://localhost/api/v1/student/study/board", {
        headers: {
          cookie: studentAuthCookie,
        },
      }),
    );
    const boardWithCreatedContentBody = (await boardWithCreatedContentResponse.json()) as {
      dailyMission: { practiceSetId: string } | null;
      practiceSets: Array<{ id: string }>;
      progress: Array<{ curriculumNodeId: string; hasConcept: boolean }>;
    };

    expect(boardWithCreatedContentResponse.status).toBe(200);
    expect(boardWithCreatedContentBody.dailyMission?.practiceSetId).toBe(createPracticeSetBody.practiceSet.id);
    expect(boardWithCreatedContentBody.practiceSets.some((practiceSet) => practiceSet.id === createPracticeSetBody.practiceSet.id)).toBe(true);
    expect(
      boardWithCreatedContentBody.progress.find((item) => item.curriculumNodeId === TEST_NODE_ID)?.hasConcept,
    ).toBe(true);

    const studentConceptResponse = await GET_STUDENT_CONCEPT(
      new Request(`http://localhost/api/v1/student/study/concepts/${TEST_NODE_ID}`, {
        headers: {
          cookie: studentAuthCookie,
        },
      }),
      {
        params: Promise.resolve({
          curriculumNodeId: TEST_NODE_ID,
        }),
      },
    );
    const studentConceptBody = (await studentConceptResponse.json()) as {
      lesson: { title: string };
      recommendedPracticeSet: { id: string } | null;
    };

    expect(studentConceptResponse.status).toBe(200);
    expect(studentConceptBody.lesson.title).toBe("[test] 문자와 식 기본 흐름");
    expect(studentConceptBody.recommendedPracticeSet?.id).toBe(createPracticeSetBody.practiceSet.id);

    const deactivateResponse = await PUT_PRACTICE_SET_ACTIVATION(
      createJsonRequest(
        `http://localhost/api/v1/study/content/practice-sets/${createPracticeSetBody.practiceSet.id}/activation`,
        guardianAuthCookie,
        "PUT",
        {
          isActive: false,
        },
      ),
      {
        params: Promise.resolve({
          id: createPracticeSetBody.practiceSet.id,
        }),
      },
    );

    expect(deactivateResponse.status).toBe(200);

    const boardAfterDeactivateResponse = await GET_STUDENT_BOARD(
      new Request("http://localhost/api/v1/student/study/board", {
        headers: {
          cookie: studentAuthCookie,
        },
      }),
    );
    const boardAfterDeactivateBody = (await boardAfterDeactivateResponse.json()) as {
      dailyMission: { practiceSetId: string } | null;
      practiceSets: Array<{ id: string }>;
    };

    expect(boardAfterDeactivateResponse.status).toBe(200);
    expect(boardAfterDeactivateBody.dailyMission?.practiceSetId).not.toBe(createPracticeSetBody.practiceSet.id);
    expect(boardAfterDeactivateBody.practiceSets.some((practiceSet) => practiceSet.id === createPracticeSetBody.practiceSet.id)).toBe(false);

    const deleteConceptResponse = await DELETE_CONCEPT(
      new Request(`http://localhost/api/v1/study/content/concepts/${TEST_NODE_ID}`, {
        method: "DELETE",
        headers: {
          cookie: guardianAuthCookie,
        },
      }),
      {
        params: Promise.resolve({
          curriculumNodeId: TEST_NODE_ID,
        }),
      },
    );

    expect(deleteConceptResponse.status).toBe(204);

    const boardAfterDeleteResponse = await GET_STUDENT_BOARD(
      new Request("http://localhost/api/v1/student/study/board", {
        headers: {
          cookie: studentAuthCookie,
        },
      }),
    );
    const boardAfterDeleteBody = (await boardAfterDeleteResponse.json()) as {
      progress: Array<{ curriculumNodeId: string; hasConcept: boolean }>;
    };

    expect(boardAfterDeleteResponse.status).toBe(200);
    expect(boardAfterDeleteBody.progress.find((item) => item.curriculumNodeId === TEST_NODE_ID)?.hasConcept).toBe(false);

    const studentConceptMissingResponse = await GET_STUDENT_CONCEPT(
      new Request(`http://localhost/api/v1/student/study/concepts/${TEST_NODE_ID}`, {
        headers: {
          cookie: studentAuthCookie,
        },
      }),
      {
        params: Promise.resolve({
          curriculumNodeId: TEST_NODE_ID,
        }),
      },
    );

    expect(studentConceptMissingResponse.status).toBe(404);
  });

  it("allows metadata updates on used practice sets but blocks structural edits", async () => {
    const [guardianAuthCookie, studentAuthCookie] = await Promise.all([
      createSeedGuardianAuthCookie(),
      createSeedStudentAuthCookie(),
    ]);

    const startSessionResponse = await POST_STUDENT_STUDY_SESSIONS(
      createJsonRequest("http://localhost/api/v1/student/study/sessions", studentAuthCookie, "POST", {
        practiceSetId: SEEDED_PRACTICE_SET_ID,
      }),
    );
    const startSessionBody = (await startSessionResponse.json()) as {
      session: {
        id: string;
      };
    };

    expect(startSessionResponse.status).toBe(201);

    const problems = await prisma.practiceProblem.findMany({
      where: {
        practiceSetId: SEEDED_PRACTICE_SET_ID,
      },
      orderBy: {
        problemNo: "asc",
      },
      select: {
        id: true,
        correctAnswer: true,
      },
    });

    const submitResponse = await POST_STUDENT_STUDY_SUBMIT(
      createJsonRequest(
        `http://localhost/api/v1/student/study/sessions/${startSessionBody.session.id}/submit`,
        studentAuthCookie,
        "POST",
        {
          elapsedSeconds: 91,
          answers: problems.map((problem) => ({
            practiceProblemId: problem.id,
            studentAnswer: problem.correctAnswer,
          })),
        },
      ),
      {
        params: Promise.resolve({
          id: startSessionBody.session.id,
        }),
      },
    );
    const submitBody = (await submitResponse.json()) as {
      result: {
        progressStatus: StudyProgressStatus;
      };
    };

    expect(submitResponse.status).toBe(200);
    expect(submitBody.result.progressStatus).toBe(StudyProgressStatus.completed);

    const seededPracticeSet = await prisma.practiceSet.findUniqueOrThrow({
      where: {
        id: SEEDED_PRACTICE_SET_ID,
      },
      include: {
        problems: {
          orderBy: {
            problemNo: "asc",
          },
        },
      },
    });

    const metadataUpdateResponse = await PUT_PRACTICE_SET(
      createJsonRequest(`http://localhost/api/v1/study/content/practice-sets/${SEEDED_PRACTICE_SET_ID}`, guardianAuthCookie, "PUT", {
        title: `${seedPracticeSetSnapshot.title} (reviewed)`,
        description: "메타데이터 수정 허용 확인",
        schoolLevel: seededPracticeSet.schoolLevel,
        grade: seededPracticeSet.grade,
        semester: seededPracticeSet.semester,
        curriculumNodeId: seededPracticeSet.curriculumNodeId,
        sortOrder: seededPracticeSet.sortOrder + 7,
        isActive: seededPracticeSet.isActive,
        problems: seededPracticeSet.problems.map((problem) => ({
          problemNo: problem.problemNo,
          type: problem.type,
          prompt: problem.prompt,
          choices: Array.isArray(problem.choicesJson) ? (problem.choicesJson as string[]) : null,
          correctAnswer: problem.correctAnswer,
          explanation: problem.explanation,
          skillTags: problem.skillTags,
          difficulty: problem.difficulty,
        })),
      }),
      {
        params: Promise.resolve({
          id: SEEDED_PRACTICE_SET_ID,
        }),
      },
    );
    const metadataUpdateBody = (await metadataUpdateResponse.json()) as {
      practiceSet: { title: string; sortOrder: number; isUsed: boolean };
    };

    expect(metadataUpdateResponse.status).toBe(200);
    expect(metadataUpdateBody.practiceSet.title).toBe(`${seedPracticeSetSnapshot.title} (reviewed)`);
    expect(metadataUpdateBody.practiceSet.sortOrder).toBe(seededPracticeSet.sortOrder + 7);
    expect(metadataUpdateBody.practiceSet.isUsed).toBe(true);

    const structuralRejectResponse = await PUT_PRACTICE_SET(
      createJsonRequest(`http://localhost/api/v1/study/content/practice-sets/${SEEDED_PRACTICE_SET_ID}`, guardianAuthCookie, "PUT", {
        title: `${seedPracticeSetSnapshot.title} (reviewed)`,
        description: "구조 수정 차단 확인",
        schoolLevel: seededPracticeSet.schoolLevel,
        grade: seededPracticeSet.grade,
        semester: seededPracticeSet.semester,
        curriculumNodeId: seededPracticeSet.curriculumNodeId,
        sortOrder: seededPracticeSet.sortOrder + 7,
        isActive: seededPracticeSet.isActive,
        problems: seededPracticeSet.problems.map((problem, index) => ({
          problemNo: problem.problemNo,
          type: problem.type,
          prompt: index === 0 ? `${problem.prompt} (edited)` : problem.prompt,
          choices: Array.isArray(problem.choicesJson) ? (problem.choicesJson as string[]) : null,
          correctAnswer: problem.correctAnswer,
          explanation: problem.explanation,
          skillTags: problem.skillTags,
          difficulty: problem.difficulty,
        })),
      }),
      {
        params: Promise.resolve({
          id: SEEDED_PRACTICE_SET_ID,
        }),
      },
    );
    const structuralRejectBody = (await structuralRejectResponse.json()) as {
      error: { code: string };
    };

    expect(structuralRejectResponse.status).toBe(409);
    expect(structuralRejectBody.error.code).toBe("CONFLICT");
  });
});
