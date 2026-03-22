import type { WorkbookProgressStatus } from "@prisma/client";

export const WORKBOOK_PROGRESS_STATUS_VALUES = ["not_started", "in_progress", "completed"] as const satisfies WorkbookProgressStatus[];

export const WORKBOOK_PROGRESS_STATUS_OPTIONS: Array<{
  key: WorkbookProgressStatus;
  labelKo: string;
}> = [
  { key: WORKBOOK_PROGRESS_STATUS_VALUES[0], labelKo: "시작전" },
  { key: WORKBOOK_PROGRESS_STATUS_VALUES[1], labelKo: "진행중" },
  { key: WORKBOOK_PROGRESS_STATUS_VALUES[2], labelKo: "완료" },
];

export function getWorkbookProgressStatusLabel(status: WorkbookProgressStatus) {
  return WORKBOOK_PROGRESS_STATUS_OPTIONS.find((option) => option.key === status)?.labelKo ?? status;
}

export function getNextWorkbookProgressStatus(status: WorkbookProgressStatus): WorkbookProgressStatus {
  const currentIndex = WORKBOOK_PROGRESS_STATUS_VALUES.indexOf(status);
  const nextIndex = (currentIndex + 1) % WORKBOOK_PROGRESS_STATUS_VALUES.length;
  return WORKBOOK_PROGRESS_STATUS_VALUES[nextIndex];
}
