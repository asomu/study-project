import { WrongNoteReason } from "@prisma/client";

export const WRONG_NOTE_DEFAULT_PAGE_SIZE = 12;
export const WRONG_NOTE_MAX_PAGE_SIZE = 50;

export const WRONG_NOTE_REASON_OPTIONS: Array<{
  key: WrongNoteReason;
  labelKo: string;
}> = [
  { key: WrongNoteReason.calculation_mistake, labelKo: "단순 연산 실수" },
  { key: WrongNoteReason.misread_question, labelKo: "문제 잘못 읽음" },
  { key: WrongNoteReason.lack_of_concept, labelKo: "문제 이해 못함" },
];

export function getWrongNoteReasonLabel(reason: WrongNoteReason) {
  return WRONG_NOTE_REASON_OPTIONS.find((option) => option.key === reason)?.labelKo ?? reason;
}
