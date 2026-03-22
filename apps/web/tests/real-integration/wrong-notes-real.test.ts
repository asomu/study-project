import { Buffer } from "node:buffer";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { WrongNoteReason } from "@prisma/client";
import { GET as GET_STUDENT_WRONG_NOTE_CHART } from "@/app/api/v1/student/wrong-notes/chart/route";
import { GET as GET_STUDENT_WRONG_NOTE_IMAGE, POST as POST_STUDENT_WRONG_NOTE_IMAGE } from "@/app/api/v1/student/wrong-notes/[id]/image/route";
import { POST as POST_STUDENT_WRONG_NOTES, GET as GET_STUDENT_WRONG_NOTES } from "@/app/api/v1/student/wrong-notes/route";
import { GET as GET_STUDENT_WRONG_NOTE_DASHBOARD } from "@/app/api/v1/student/wrong-notes/dashboard/route";
import { GET as GET_STUDENT_WRONG_NOTE_DETAIL, PATCH as PATCH_STUDENT_WRONG_NOTE, DELETE as DELETE_STUDENT_WRONG_NOTE } from "@/app/api/v1/student/wrong-notes/[id]/route";
import { GET as GET_GUARDIAN_WRONG_NOTE_CHART } from "@/app/api/v1/wrong-notes/chart/route";
import { GET as GET_GUARDIAN_WRONG_NOTES } from "@/app/api/v1/wrong-notes/route";
import { GET as GET_GUARDIAN_WRONG_NOTE_DASHBOARD } from "@/app/api/v1/wrong-notes/dashboard/route";
import { PUT as PUT_GUARDIAN_WRONG_NOTE_FEEDBACK } from "@/app/api/v1/wrong-notes/[id]/feedback/route";
import { GET as GET_GUARDIAN_WRONG_NOTE_IMAGE } from "@/app/api/v1/wrong-notes/[id]/image/route";
import { prisma } from "@/lib/prisma";
import {
  clearTestUploadDirectory,
  createSeedGuardianAuthCookie,
  createSeedStudentAuthCookie,
  getSeedGuardian,
  resetSeedStudentAccountState,
  resetSeedStudentScopedData,
  SEEDED_GRADE2_CURRICULUM_NODE_ID,
  SEEDED_STUDENT_ID,
} from "./db-test-helpers";

const HEIC_HEADER_BUFFER = Buffer.concat([
  Buffer.from([0x00, 0x00, 0x00, 0x18]),
  Buffer.from("ftyp"),
  Buffer.from("heic"),
  Buffer.alloc(4),
]);

describe("real integration: wrong-note workflow", () => {
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

  it("creates, updates, feedbacks, and soft-deletes wrong-notes", async () => {
    const [studentAuthCookie, guardianAuthCookie] = await Promise.all([
      createSeedStudentAuthCookie(),
      createSeedGuardianAuthCookie(),
    ]);

    const createForm = new FormData();
    createForm.set(
      "file",
      new File([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])], "first-note.png", {
        type: "image/png",
      }),
    );
    createForm.set("grade", "2");
    createForm.set("semester", "1");
    createForm.set("curriculumNodeId", SEEDED_GRADE2_CURRICULUM_NODE_ID);
    createForm.set("reason", WrongNoteReason.calculation_mistake);
    createForm.set("studentMemo", "부호 계산 순서를 놓쳤어요.");

    const createResponse = await POST_STUDENT_WRONG_NOTES(
      new Request("http://localhost/api/v1/student/wrong-notes", {
        method: "POST",
        headers: {
          cookie: studentAuthCookie,
        },
        body: createForm,
      }),
    );
    const createBody = (await createResponse.json()) as {
      id: string;
      imagePath: string;
      reason: { key: WrongNoteReason };
      studentMemo: string | null;
      curriculum: { grade: number; unitName: string };
    };

    expect(createResponse.status).toBe(201);
    expect(createBody.imagePath).toBe(`/api/v1/student/wrong-notes/${createBody.id}/image`);
    expect(createBody.reason.key).toBe(WrongNoteReason.calculation_mistake);
    expect(createBody.studentMemo).toBe("부호 계산 순서를 놓쳤어요.");
    expect(createBody.curriculum.grade).toBe(2);
    expect(createBody.curriculum.unitName).toBe("유리수와 순환소수");

    const storedWrongNoteAfterCreate = await prisma.wrongNote.findUnique({
      where: {
        id: createBody.id,
      },
      select: {
        imagePath: true,
      },
    });

    expect(storedWrongNoteAfterCreate?.imagePath).toMatch(
      new RegExp(`^${SEEDED_STUDENT_ID}/${createBody.id}/.+\\.png$`),
    );

    const studentDashboardResponse = await GET_STUDENT_WRONG_NOTE_DASHBOARD(
      new Request("http://localhost/api/v1/student/wrong-notes/dashboard", {
        method: "GET",
        headers: {
          cookie: studentAuthCookie,
        },
      }),
    );
    const studentDashboardBody = (await studentDashboardResponse.json()) as {
      summary: {
        totalNotes: number;
        reasonCounts: Record<WrongNoteReason, number>;
      };
    };

    expect(studentDashboardResponse.status).toBe(200);
    expect(studentDashboardBody.summary.totalNotes).toBe(1);
    expect(studentDashboardBody.summary.reasonCounts.calculation_mistake).toBe(1);

    const studentChartResponse = await GET_STUDENT_WRONG_NOTE_CHART(
      new Request("http://localhost/api/v1/student/wrong-notes/chart?dimension=unit&grade=2&semester=1", {
        method: "GET",
        headers: {
          cookie: studentAuthCookie,
        },
      }),
    );
    const studentChartBody = (await studentChartResponse.json()) as {
      chart: {
        dimension: string;
        bars: Array<{ key: string; value: number }>;
        totalCount: number;
      };
    };

    expect(studentChartResponse.status).toBe(200);
    expect(studentChartBody.chart.dimension).toBe("unit");
    expect(studentChartBody.chart.totalCount).toBe(1);
    expect(studentChartBody.chart.bars.length).toBe(6);
    expect(studentChartBody.chart.bars.some((bar) => bar.value === 0)).toBe(true);

    const advancedGradeChartResponse = await GET_STUDENT_WRONG_NOTE_CHART(
      new Request("http://localhost/api/v1/student/wrong-notes/chart?dimension=unit&grade=3&semester=2", {
        method: "GET",
        headers: {
          cookie: studentAuthCookie,
        },
      }),
    );
    const advancedGradeChartBody = (await advancedGradeChartResponse.json()) as {
      chart: {
        bars: Array<{ key: string; value: number }>;
        totalCount: number;
      };
    };

    expect(advancedGradeChartResponse.status).toBe(200);
    expect(advancedGradeChartBody.chart.bars.length).toBe(3);
    expect(advancedGradeChartBody.chart.totalCount).toBe(0);
    expect(advancedGradeChartBody.chart.bars.every((bar) => bar.value === 0)).toBe(true);

    const studentListResponse = await GET_STUDENT_WRONG_NOTES(
      new Request("http://localhost/api/v1/student/wrong-notes?grade=2", {
        method: "GET",
        headers: {
          cookie: studentAuthCookie,
        },
      }),
    );
    const studentListBody = (await studentListResponse.json()) as {
      pagination: {
        totalItems: number;
      };
      wrongNotes: Array<{ id: string }>;
    };

    expect(studentListResponse.status).toBe(200);
    expect(studentListBody.pagination.totalItems).toBe(1);
    expect(studentListBody.wrongNotes[0]?.id).toBe(createBody.id);

    const patchResponse = await PATCH_STUDENT_WRONG_NOTE(
      new Request(`http://localhost/api/v1/student/wrong-notes/${createBody.id}`, {
        method: "PATCH",
        headers: {
          cookie: studentAuthCookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          reason: WrongNoteReason.misread_question,
          studentMemo: "문장을 끝까지 읽지 않았어요.",
        }),
      }),
      {
        params: Promise.resolve({
          id: createBody.id,
        }),
      },
    );
    const patchBody = (await patchResponse.json()) as {
      reason: { key: WrongNoteReason };
      studentMemo: string | null;
    };

    expect(patchResponse.status).toBe(200);
    expect(patchBody.reason.key).toBe(WrongNoteReason.misread_question);
    expect(patchBody.studentMemo).toBe("문장을 끝까지 읽지 않았어요.");

    const imageForm = new FormData();
    imageForm.set(
      "file",
      new File([HEIC_HEADER_BUFFER], "replacement.heic", {
        type: "image/heic",
      }),
    );

    const imageResponse = await POST_STUDENT_WRONG_NOTE_IMAGE(
      new Request(`http://localhost/api/v1/student/wrong-notes/${createBody.id}/image`, {
        method: "POST",
        headers: {
          cookie: studentAuthCookie,
        },
        body: imageForm,
      }),
      {
        params: Promise.resolve({
          id: createBody.id,
        }),
      },
    );
    const imageBody = (await imageResponse.json()) as { imagePath: string };

    expect(imageResponse.status).toBe(200);
    expect(imageBody.imagePath).toBe(`/api/v1/student/wrong-notes/${createBody.id}/image`);

    const storedWrongNoteAfterReplace = await prisma.wrongNote.findUnique({
      where: {
        id: createBody.id,
      },
      select: {
        imagePath: true,
      },
    });

    expect(storedWrongNoteAfterReplace?.imagePath).toMatch(
      new RegExp(`^${SEEDED_STUDENT_ID}/${createBody.id}/.+\\.heic$`),
    );

    const studentImageGetResponse = await GET_STUDENT_WRONG_NOTE_IMAGE(
      new Request(`http://localhost/api/v1/student/wrong-notes/${createBody.id}/image`, {
        method: "GET",
        headers: {
          cookie: studentAuthCookie,
        },
      }),
      {
        params: Promise.resolve({
          id: createBody.id,
        }),
      },
    );

    expect(studentImageGetResponse.status).toBe(200);
    expect(studentImageGetResponse.headers.get("content-type")).toBe("image/heic");
    expect((await studentImageGetResponse.arrayBuffer()).byteLength).toBeGreaterThan(0);

    const guardianDashboardResponse = await GET_GUARDIAN_WRONG_NOTE_DASHBOARD(
      new Request(`http://localhost/api/v1/wrong-notes/dashboard?studentId=${SEEDED_STUDENT_ID}`, {
        method: "GET",
        headers: {
          cookie: guardianAuthCookie,
        },
      }),
    );
    const guardianDashboardBody = (await guardianDashboardResponse.json()) as {
      summary: {
        totalNotes: number;
      };
    };

    expect(guardianDashboardResponse.status).toBe(200);
    expect(guardianDashboardBody.summary.totalNotes).toBe(1);

    const guardianListResponse = await GET_GUARDIAN_WRONG_NOTES(
      new Request(`http://localhost/api/v1/wrong-notes?studentId=${SEEDED_STUDENT_ID}`, {
        method: "GET",
        headers: {
          cookie: guardianAuthCookie,
        },
      }),
    );
    const guardianListBody = (await guardianListResponse.json()) as {
      wrongNotes: Array<{ id: string; feedback: null | { text: string } }>;
    };

    expect(guardianListResponse.status).toBe(200);
    expect(guardianListBody.wrongNotes[0]?.id).toBe(createBody.id);
    expect(guardianListBody.wrongNotes[0]?.feedback).toBeNull();

    const feedbackResponse = await PUT_GUARDIAN_WRONG_NOTE_FEEDBACK(
      new Request(`http://localhost/api/v1/wrong-notes/${createBody.id}/feedback`, {
        method: "PUT",
        headers: {
          cookie: guardianAuthCookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          text: "문장을 끝까지 읽고 조건에 밑줄을 쳐보자.",
        }),
      }),
      {
        params: Promise.resolve({
          id: createBody.id,
        }),
      },
    );
    const feedbackBody = (await feedbackResponse.json()) as {
      feedback: { text: string } | null;
    };

    expect(feedbackResponse.status).toBe(200);
    expect(feedbackBody.feedback?.text).toContain("조건에 밑줄");

    const guardianChartResponse = await GET_GUARDIAN_WRONG_NOTE_CHART(
      new Request(`http://localhost/api/v1/wrong-notes/chart?studentId=${SEEDED_STUDENT_ID}&dimension=reason&grade=2&semester=1`, {
        method: "GET",
        headers: {
          cookie: guardianAuthCookie,
        },
      }),
    );
    const guardianChartBody = (await guardianChartResponse.json()) as {
      chart: {
        bars: Array<{ key: string; value: number }>;
        totalCount: number;
      };
    };

    expect(guardianChartResponse.status).toBe(200);
    expect(guardianChartBody.chart.totalCount).toBe(1);
    expect(guardianChartBody.chart.bars.find((bar) => bar.key === WrongNoteReason.misread_question)?.value).toBe(1);

    const guardianImageGetResponse = await GET_GUARDIAN_WRONG_NOTE_IMAGE(
      new Request(`http://localhost/api/v1/wrong-notes/${createBody.id}/image?studentId=${SEEDED_STUDENT_ID}`, {
        method: "GET",
        headers: {
          cookie: guardianAuthCookie,
        },
      }),
      {
        params: Promise.resolve({
          id: createBody.id,
        }),
      },
    );

    expect(guardianImageGetResponse.status).toBe(200);
    expect(guardianImageGetResponse.headers.get("content-type")).toBe("image/heic");
    expect((await guardianImageGetResponse.arrayBuffer()).byteLength).toBeGreaterThan(0);

    const detailResponse = await GET_STUDENT_WRONG_NOTE_DETAIL(
      new Request(`http://localhost/api/v1/student/wrong-notes/${createBody.id}`, {
        method: "GET",
        headers: {
          cookie: studentAuthCookie,
        },
      }),
      {
        params: Promise.resolve({
          id: createBody.id,
        }),
      },
    );
    const detailBody = (await detailResponse.json()) as {
      feedback: { text: string } | null;
    };

    expect(detailResponse.status).toBe(200);
    expect(detailBody.feedback?.text).toContain("조건에 밑줄");

    const deleteResponse = await DELETE_STUDENT_WRONG_NOTE(
      new Request(`http://localhost/api/v1/student/wrong-notes/${createBody.id}`, {
        method: "DELETE",
        headers: {
          cookie: studentAuthCookie,
        },
      }),
      {
        params: Promise.resolve({
          id: createBody.id,
        }),
      },
    );

    expect(deleteResponse.status).toBe(204);

    const afterDeleteResponse = await GET_STUDENT_WRONG_NOTES(
      new Request("http://localhost/api/v1/student/wrong-notes", {
        method: "GET",
        headers: {
          cookie: studentAuthCookie,
        },
      }),
    );
    const afterDeleteBody = (await afterDeleteResponse.json()) as {
      pagination: {
        totalItems: number;
      };
    };

    expect(afterDeleteResponse.status).toBe(200);
    expect(afterDeleteBody.pagination.totalItems).toBe(0);
  });
});
