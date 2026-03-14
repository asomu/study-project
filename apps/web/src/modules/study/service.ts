import type { Material, Prisma, PracticeProblem, PracticeSet, Student } from "@prisma/client";
import {
  MaterialSourceType,
  PracticeProblemType,
  StudyProgressStatus,
  Subject,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasValidImageSignature, saveStudyWorkArtifactImage } from "@/modules/mistake-note/upload";

const MAX_ELAPSED_SECONDS = 8 * 60 * 60;

export type PracticeSubmissionResult = {
  totalProblems: number;
  correctItems: number;
  wrongItems: number;
  gradedItems: Array<{
    curriculumNodeId: string;
    practiceProblemId: string;
    problemNo: number;
    isCorrect: boolean;
    difficulty: number;
    studentAnswer: string;
  }>;
};

export type DailyMissionCandidate = {
  practiceSetId: string;
  title: string;
  curriculumNodeId: string;
  unitName: string;
  problemCount: number;
  sortOrder: number;
  progressStatus: StudyProgressStatus;
};

export type ReviewQueueItem = {
  attemptId: string;
  submittedAt: Date;
  wrongItems: number;
  hasReview: boolean;
};

const dailyMissionPriority: Record<StudyProgressStatus, number> = {
  review_needed: 0,
  in_progress: 1,
  planned: 2,
  completed: 3,
};

export function getCurrentSemester(asOfDate: Date) {
  return asOfDate.getUTCMonth() + 1 >= 7 ? 2 : 1;
}

function normalizeComparableAnswer(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/×/g, "x")
    .replace(/\s+/g, " ")
    .replace(/\s*x\s*/g, " x ");
}

function isCorrectAnswer(problem: Pick<PracticeProblem, "type" | "correctAnswer">, studentAnswer: string) {
  if (problem.type === PracticeProblemType.single_choice) {
    return studentAnswer.trim() === problem.correctAnswer.trim();
  }

  return normalizeComparableAnswer(studentAnswer) === normalizeComparableAnswer(problem.correctAnswer);
}

export function normalizeElapsedSeconds(
  reportedSeconds: number | null | undefined,
  startedAt?: Date | null,
  submittedAt?: Date | null,
) {
  if (typeof reportedSeconds === "number" && Number.isFinite(reportedSeconds)) {
    return Math.max(0, Math.min(MAX_ELAPSED_SECONDS, Math.round(reportedSeconds)));
  }

  if (startedAt && submittedAt) {
    const diff = Math.round((submittedAt.getTime() - startedAt.getTime()) / 1000);
    return Math.max(0, Math.min(MAX_ELAPSED_SECONDS, diff));
  }

  return 0;
}

export function gradePracticeSubmission(
  problems: Array<
    Pick<PracticeProblem, "id" | "curriculumNodeId" | "problemNo" | "type" | "correctAnswer" | "difficulty">
  >,
  answers: Array<{ practiceProblemId: string; studentAnswer: string }>,
): PracticeSubmissionResult {
  const answersByProblemId = new Map(answers.map((entry) => [entry.practiceProblemId, entry.studentAnswer]));

  const gradedItems = problems.map((problem) => {
    const studentAnswer = answersByProblemId.get(problem.id)?.trim() ?? "";

    return {
      curriculumNodeId: problem.curriculumNodeId,
      practiceProblemId: problem.id,
      problemNo: problem.problemNo,
      isCorrect: studentAnswer.length > 0 && isCorrectAnswer(problem, studentAnswer),
      difficulty: problem.difficulty,
      studentAnswer,
    };
  });

  const correctItems = gradedItems.filter((item) => item.isCorrect).length;

  return {
    totalProblems: gradedItems.length,
    correctItems,
    wrongItems: gradedItems.length - correctItems,
    gradedItems,
  };
}

export function buildSystemMaterialKey(studentId: string, practiceSetId: string) {
  return `practice:${studentId}:${practiceSetId}`;
}

export async function ensurePracticeMaterial(
  tx: Prisma.TransactionClient,
  student: Pick<Student, "id" | "schoolLevel" | "grade">,
  practiceSet: Pick<PracticeSet, "id" | "title" | "grade" | "semester">,
): Promise<Material> {
  const systemKey = buildSystemMaterialKey(student.id, practiceSet.id);
  const existing = await tx.material.findUnique({
    where: {
      systemKey,
    },
  });

  if (existing) {
    return tx.material.update({
      where: {
        id: existing.id,
      },
      data: {
        title: practiceSet.title,
      },
    });
  }

  return tx.material.create({
    data: {
      studentId: student.id,
      title: practiceSet.title,
      publisher: "study-system",
      subject: Subject.math,
      schoolLevel: student.schoolLevel,
      grade: practiceSet.grade,
      semester: practiceSet.semester,
      sourceType: MaterialSourceType.system,
      systemKey,
    },
  });
}

export function isValidProgressTransition(
  currentStatus: StudyProgressStatus | null | undefined,
  nextStatus: StudyProgressStatus,
) {
  if (!currentStatus || currentStatus === nextStatus) {
    return true;
  }

  const allowed: Record<StudyProgressStatus, StudyProgressStatus[]> = {
    planned: [StudyProgressStatus.in_progress, StudyProgressStatus.review_needed, StudyProgressStatus.completed],
    in_progress: [StudyProgressStatus.in_progress, StudyProgressStatus.review_needed, StudyProgressStatus.completed],
    review_needed: [StudyProgressStatus.in_progress, StudyProgressStatus.review_needed, StudyProgressStatus.completed],
    completed: [StudyProgressStatus.completed, StudyProgressStatus.review_needed],
  };

  return allowed[currentStatus].includes(nextStatus);
}

export function selectDailyMission(candidates: DailyMissionCandidate[]) {
  if (!candidates.length) {
    return null;
  }

  const sorted = [...candidates].sort((left, right) => {
    const priorityDiff = dailyMissionPriority[left.progressStatus] - dailyMissionPriority[right.progressStatus];

    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.title.localeCompare(right.title, "ko");
  });

  const selected = sorted[0];
  const reasonMap: Record<StudyProgressStatus, string> = {
    review_needed: "최근 리뷰가 필요한 단원을 먼저 복습합니다.",
    in_progress: "이미 시작한 단원을 이어서 학습합니다.",
    planned: "아직 시작하지 않은 단원을 오늘의 첫 학습으로 제안합니다.",
    completed: "완료 단원 중 가장 앞선 세트를 복습용으로 제안합니다.",
  };

  return {
    ...selected,
    reason: reasonMap[selected.progressStatus],
  };
}

export function summarizeProgressStatuses(progress: Array<{ status: StudyProgressStatus }>) {
  return progress.reduce<Record<StudyProgressStatus, number>>(
    (summary, entry) => {
      summary[entry.status] += 1;
      return summary;
    },
    {
      planned: 0,
      in_progress: 0,
      review_needed: 0,
      completed: 0,
    },
  );
}

export function mergeUnitProgressState(
  nodes: Array<{ id: string; unitName: string; sortOrder: number }>,
  progressRows: Array<{
    curriculumNodeId: string;
    status: StudyProgressStatus;
    note: string | null;
    lastStudiedAt: Date | null;
    reviewedAt: Date | null;
  }>,
  practiceSets: Array<{ id: string; title: string; curriculumNodeId: string }>,
  conceptLessonIds: Set<string>,
) {
  const progressByNodeId = new Map(progressRows.map((row) => [row.curriculumNodeId, row]));
  const practiceSetByNodeId = new Map(practiceSets.map((set) => [set.curriculumNodeId, set]));

  return nodes.map((node) => {
    const progress = progressByNodeId.get(node.id);
    const practiceSet = practiceSetByNodeId.get(node.id);

    return {
      curriculumNodeId: node.id,
      unitName: node.unitName,
      sortOrder: node.sortOrder,
      status: progress?.status ?? StudyProgressStatus.planned,
      note: progress?.note ?? null,
      lastStudiedAt: progress?.lastStudiedAt ?? null,
      reviewedAt: progress?.reviewedAt ?? null,
      hasConcept: conceptLessonIds.has(node.id),
      practiceSetId: practiceSet?.id ?? null,
      practiceSetTitle: practiceSet?.title ?? null,
    };
  });
}

export function sortReviewQueue<T extends ReviewQueueItem>(items: T[]) {
  return [...items].sort((left, right) => {
    if (left.hasReview !== right.hasReview) {
      return left.hasReview ? 1 : -1;
    }

    if (left.submittedAt.getTime() !== right.submittedAt.getTime()) {
      return right.submittedAt.getTime() - left.submittedAt.getTime();
    }

    return right.wrongItems - left.wrongItems;
  });
}

export function parseCanvasPngDataUrl(dataUrl: string) {
  const prefix = "data:image/png;base64,";

  if (!dataUrl.startsWith(prefix)) {
    return null;
  }

  try {
    const buffer = Buffer.from(dataUrl.slice(prefix.length), "base64");

    if (!hasValidImageSignature("image/png", buffer)) {
      return null;
    }

    return buffer;
  } catch {
    return null;
  }
}

export async function saveStudyCanvasArtifact(attemptId: string, canvasImageDataUrl: string) {
  const buffer = parseCanvasPngDataUrl(canvasImageDataUrl);

  if (!buffer) {
    return null;
  }

  return saveStudyWorkArtifactImage(buffer, attemptId);
}

export async function getStudentCurrentSemesterNodes(student: Pick<Student, "schoolLevel" | "grade">, asOfDate: Date) {
  const semester = getCurrentSemester(asOfDate);

  return prisma.curriculumNode.findMany({
    where: {
      schoolLevel: student.schoolLevel,
      subject: Subject.math,
      grade: student.grade,
      semester,
      activeFrom: {
        lte: asOfDate,
      },
      OR: [{ activeTo: null }, { activeTo: { gte: asOfDate } }],
    },
    orderBy: [{ sortOrder: "asc" }, { unitCode: "asc" }],
  });
}
