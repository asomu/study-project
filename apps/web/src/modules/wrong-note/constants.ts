import type { SchoolLevel, WrongNoteReason } from "@prisma/client";
import type { WrongNoteChartDimension } from "@/modules/wrong-note/contracts";

export const WRONG_NOTE_DEFAULT_PAGE_SIZE = 12;
export const WRONG_NOTE_MAX_PAGE_SIZE = 50;
export const WRONG_NOTE_REASON_VALUES = ["calculation_mistake", "misread_question", "lack_of_concept"] as const satisfies WrongNoteReason[];
export const WRONG_NOTE_CHART_DIMENSION_VALUES = ["unit", "reason"] as const satisfies WrongNoteChartDimension[];

export const WRONG_NOTE_REASON_OPTIONS: Array<{
  key: WrongNoteReason;
  labelKo: string;
}> = [
  { key: WRONG_NOTE_REASON_VALUES[0], labelKo: "단순 연산 실수" },
  { key: WRONG_NOTE_REASON_VALUES[1], labelKo: "문제 잘못 읽음" },
  { key: WRONG_NOTE_REASON_VALUES[2], labelKo: "문제 이해 못함" },
];

export const WRONG_NOTE_CHART_DIMENSION_OPTIONS: Array<{
  key: WrongNoteChartDimension;
  labelKo: string;
}> = [
  { key: WRONG_NOTE_CHART_DIMENSION_VALUES[0], labelKo: "단원별 오답 현황" },
  { key: WRONG_NOTE_CHART_DIMENSION_VALUES[1], labelKo: "오류유형별 오답 현황" },
];

export function getWrongNoteReasonLabel(reason: WrongNoteReason) {
  return WRONG_NOTE_REASON_OPTIONS.find((option) => option.key === reason)?.labelKo ?? reason;
}

const SCHOOL_LEVEL_GRADE_OPTIONS: Record<SchoolLevel, number[]> = {
  elementary: [1, 2, 3, 4, 5, 6],
  middle: [1, 2, 3],
  high: [1, 2, 3],
};

export function getGradeOptionsForSchoolLevel(schoolLevel: SchoolLevel) {
  return SCHOOL_LEVEL_GRADE_OPTIONS[schoolLevel];
}

export function isGradeAllowedForSchoolLevel(schoolLevel: SchoolLevel, grade: number) {
  return getGradeOptionsForSchoolLevel(schoolLevel).includes(grade);
}

export function formatSchoolGradeLabel(schoolLevel: SchoolLevel, grade: number) {
  if (schoolLevel === "elementary") {
    return `초${grade}`;
  }

  if (schoolLevel === "high") {
    return `고${grade}`;
  }

  return `중${grade}`;
}
