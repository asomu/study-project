import type { Prisma, StudyProgressStatus } from "@prisma/client";

export type PracticeSetWithProblems = Prisma.PracticeSetGetPayload<{
  include: {
    curriculumNode: true;
    problems: true;
  };
}>;

export type AuthoringPracticeSet = Prisma.PracticeSetGetPayload<{
  include: {
    curriculumNode: true;
    problems: true;
    _count: {
      select: {
        attempts: true;
      };
    };
  };
}>;

export type StudyAttemptSummary = Prisma.AttemptGetPayload<{
  include: {
    practiceSet: {
      include: {
        curriculumNode: true;
      };
    };
    items: true;
    studyReview: true;
    workArtifact: true;
  };
}>;

export function serializePracticeProblem(problem: PracticeSetWithProblems["problems"][number]) {
  return {
    id: problem.id,
    problemNo: problem.problemNo,
    type: problem.type,
    prompt: problem.prompt,
    choices: Array.isArray(problem.choicesJson) ? (problem.choicesJson as string[]) : null,
    correctAnswer: problem.correctAnswer,
    explanation: problem.explanation,
    difficulty: problem.difficulty,
    skillTags: problem.skillTags,
  };
}

export function serializeAuthoringPracticeSet(practiceSet: AuthoringPracticeSet) {
  return {
    id: practiceSet.id,
    title: practiceSet.title,
    description: practiceSet.description,
    schoolLevel: practiceSet.schoolLevel,
    grade: practiceSet.grade,
    semester: practiceSet.semester,
    curriculumNodeId: practiceSet.curriculumNodeId,
    unitName: practiceSet.curriculumNode.unitName,
    sortOrder: practiceSet.sortOrder,
    isActive: practiceSet.isActive,
    isUsed: (practiceSet._count?.attempts ?? 0) > 0,
    attemptCount: practiceSet._count?.attempts ?? 0,
    problemCount: practiceSet.problems.length,
    problems: practiceSet.problems.map(serializePracticeProblem),
    updatedAt: practiceSet.updatedAt,
  };
}

export function serializeAuthoringConceptLesson(lesson: Prisma.ConceptLessonGetPayload<{ include: { curriculumNode: true } }>) {
  return {
    id: lesson.id,
    curriculumNodeId: lesson.curriculumNodeId,
    unitName: lesson.curriculumNode.unitName,
    title: lesson.title,
    summary: lesson.summary,
    content: lesson.contentJson,
    updatedAt: lesson.updatedAt,
  };
}

export function serializeStudySessionSummary(attempt: StudyAttemptSummary) {
  const correctItems = attempt.items.filter((item) => item.isCorrect).length;
  const wrongItems = attempt.items.length - correctItems;

  return {
    id: attempt.id,
    attemptDate: attempt.attemptDate,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    elapsedSeconds: attempt.elapsedSeconds,
    sourceType: attempt.sourceType,
    practiceSet: attempt.practiceSet
      ? {
          id: attempt.practiceSet.id,
          title: attempt.practiceSet.title,
          curriculumNodeId: attempt.practiceSet.curriculumNodeId,
          unitName: attempt.practiceSet.curriculumNode.unitName,
        }
      : null,
    result: {
      totalProblems: attempt.items.length,
      correctItems,
      wrongItems,
    },
    review: attempt.studyReview
      ? {
          id: attempt.studyReview.id,
          feedback: attempt.studyReview.feedback,
          progressStatus: attempt.studyReview.progressStatus,
          reviewedAt: attempt.studyReview.reviewedAt,
        }
      : null,
    workArtifact: attempt.workArtifact
      ? {
          imagePath: attempt.workArtifact.imagePath,
        }
      : null,
  };
}

export function serializeProgressItem(item: {
  curriculumNodeId: string;
  unitName: string;
  status: StudyProgressStatus;
  note: string | null;
  lastStudiedAt: Date | null;
  reviewedAt: Date | null;
  hasConcept: boolean;
  practiceSetId: string | null;
  practiceSetTitle: string | null;
}) {
  return {
    curriculumNodeId: item.curriculumNodeId,
    unitName: item.unitName,
    status: item.status,
    note: item.note,
    lastStudiedAt: item.lastStudiedAt,
    reviewedAt: item.reviewedAt,
    hasConcept: item.hasConcept,
    practiceSetId: item.practiceSetId,
    practiceSetTitle: item.practiceSetTitle,
  };
}
