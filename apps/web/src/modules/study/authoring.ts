import type { PracticeProblem, PracticeSet } from "@prisma/client";
import { PracticeProblemType, Prisma, Subject } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AuthoringFilters = {
  schoolLevel: "elementary" | "middle" | "high";
  grade: number;
  semester: number;
};

export type AuthoringPracticeProblemInput = {
  problemNo: number;
  type: PracticeProblemType;
  prompt: string;
  choices: string[] | null;
  correctAnswer: string;
  explanation?: string | null;
  skillTags: string[];
  difficulty: number;
};

export function normalizeSkillTags(skillTags: string[]) {
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const rawTag of skillTags) {
    const nextTag = rawTag.trim().toLowerCase();

    if (!nextTag || seen.has(nextTag)) {
      continue;
    }

    normalized.push(nextTag);
    seen.add(nextTag);
  }

  return normalized;
}

export function normalizeChoiceList(choices: string[] | null | undefined) {
  if (!choices) {
    return null;
  }

  const normalized = choices.map((choice) => choice.trim()).filter(Boolean);

  return normalized.length ? normalized : null;
}

export function normalizePracticeProblemInput(problem: AuthoringPracticeProblemInput) {
  return {
    problemNo: problem.problemNo,
    type: problem.type,
    prompt: problem.prompt.trim(),
    choices: problem.type === PracticeProblemType.single_choice ? normalizeChoiceList(problem.choices) : null,
    correctAnswer: problem.correctAnswer.trim(),
    explanation: problem.explanation?.trim() ? problem.explanation.trim() : null,
    skillTags: normalizeSkillTags(problem.skillTags),
    difficulty: problem.difficulty,
  };
}

function normalizePersistedPracticeProblem(problem: Pick<PracticeProblem, "problemNo" | "type" | "prompt" | "choicesJson" | "correctAnswer" | "explanation" | "skillTags" | "difficulty">) {
  return {
    problemNo: problem.problemNo,
    type: problem.type,
    prompt: problem.prompt.trim(),
    choices:
      problem.type === PracticeProblemType.single_choice && Array.isArray(problem.choicesJson)
        ? normalizeChoiceList((problem.choicesJson as string[]) ?? null)
        : null,
    correctAnswer: problem.correctAnswer.trim(),
    explanation: problem.explanation?.trim() ? problem.explanation.trim() : null,
    skillTags: normalizeSkillTags(problem.skillTags),
    difficulty: problem.difficulty,
  };
}

function toComparablePracticeProblems(
  problems: Array<
    | AuthoringPracticeProblemInput
    | Pick<PracticeProblem, "problemNo" | "type" | "prompt" | "choicesJson" | "correctAnswer" | "explanation" | "skillTags" | "difficulty">
  >,
) {
  return [...problems]
    .map((problem) =>
      "choicesJson" in problem ? normalizePersistedPracticeProblem(problem) : normalizePracticeProblemInput(problem),
    )
    .toSorted((left, right) => left.problemNo - right.problemNo);
}

export function hasPracticeSetStructuralChanges(
  existing: Pick<PracticeSet, "schoolLevel" | "grade" | "semester" | "curriculumNodeId"> & {
    problems: Array<
      Pick<PracticeProblem, "problemNo" | "type" | "prompt" | "choicesJson" | "correctAnswer" | "explanation" | "skillTags" | "difficulty">
    >;
  },
  next: Pick<PracticeSet, "schoolLevel" | "grade" | "semester" | "curriculumNodeId"> & {
    problems: AuthoringPracticeProblemInput[];
  },
) {
  if (
    existing.schoolLevel !== next.schoolLevel ||
    existing.grade !== next.grade ||
    existing.semester !== next.semester ||
    existing.curriculumNodeId !== next.curriculumNodeId
  ) {
    return true;
  }

  const currentProblems = toComparablePracticeProblems(existing.problems);
  const nextProblems = toComparablePracticeProblems(next.problems);

  return JSON.stringify(currentProblems) !== JSON.stringify(nextProblems);
}

export async function getLatestCurriculumNodes(filters: AuthoringFilters) {
  const latestVersion = await prisma.curriculumNode.findFirst({
    where: {
      schoolLevel: filters.schoolLevel,
      subject: Subject.math,
      grade: filters.grade,
      semester: filters.semester,
    },
    orderBy: [{ activeFrom: "desc" }, { curriculumVersion: "desc" }],
    select: {
      curriculumVersion: true,
    },
  });

  if (!latestVersion) {
    return {
      curriculumVersion: null,
      curriculumNodes: [],
    };
  }

  const curriculumNodes = await prisma.curriculumNode.findMany({
    where: {
      schoolLevel: filters.schoolLevel,
      subject: Subject.math,
      grade: filters.grade,
      semester: filters.semester,
      curriculumVersion: latestVersion.curriculumVersion,
    },
    orderBy: [{ sortOrder: "asc" }, { unitCode: "asc" }],
    select: {
      id: true,
      curriculumVersion: true,
      unitCode: true,
      unitName: true,
      sortOrder: true,
    },
  });

  return {
    curriculumVersion: latestVersion.curriculumVersion,
    curriculumNodes,
  };
}

export function toPracticeProblemWriteData(
  practiceSetId: string,
  curriculumNodeId: string,
  problems: AuthoringPracticeProblemInput[],
): Prisma.PracticeProblemCreateManyInput[] {
  return problems.map((problem) => {
    const normalized = normalizePracticeProblemInput(problem);

    return {
      practiceSetId,
      curriculumNodeId,
      problemNo: normalized.problemNo,
      type: normalized.type,
      prompt: normalized.prompt,
      choicesJson: normalized.choices ?? Prisma.DbNull,
      correctAnswer: normalized.correctAnswer,
      explanation: normalized.explanation,
      skillTags: normalized.skillTags,
      difficulty: normalized.difficulty,
    };
  });
}

export function isPracticeSetStructureEditable(attemptCount: number) {
  return attemptCount === 0;
}
