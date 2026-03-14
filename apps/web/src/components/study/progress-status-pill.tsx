"use client";

import { StudyProgressStatus } from "@prisma/client";

const statusLabel: Record<StudyProgressStatus, string> = {
  planned: "예정",
  in_progress: "학습 중",
  review_needed: "복습 필요",
  completed: "완료",
};

const statusClassName: Record<StudyProgressStatus, string> = {
  planned: "border-slate-200 bg-slate-100 text-slate-700",
  in_progress: "border-sky-200 bg-sky-50 text-sky-700",
  review_needed: "border-amber-200 bg-amber-50 text-amber-800",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

type ProgressStatusPillProps = {
  status: StudyProgressStatus;
};

export function ProgressStatusPill({ status }: ProgressStatusPillProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusClassName[status]}`}
    >
      {statusLabel[status]}
    </span>
  );
}

export function getProgressStatusLabel(status: StudyProgressStatus) {
  return statusLabel[status];
}
