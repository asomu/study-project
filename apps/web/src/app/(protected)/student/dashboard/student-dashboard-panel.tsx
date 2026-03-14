"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { TrendsLineChart } from "@/components/dashboard/trends-line-chart";
import { WeaknessTable } from "@/components/dashboard/weakness-table";
import { getProgressStatusLabel } from "@/components/study/progress-status-pill";

type OverviewResponse = {
  student: {
    id: string;
    name: string;
    schoolLevel: "elementary" | "middle" | "high";
    grade: number;
  };
  today: {
    date: string;
    totalItems: number;
    correctItems: number;
    accuracyPct: number;
  };
  recent7Days: {
    totalItems: number;
    correctItems: number;
    accuracyPct: number;
  };
  focus: {
    weakUnits: Array<{
      curriculumNodeId: string;
      unitName: string;
      attempts: number;
      accuracyPct: number;
      wrongCount: number;
    }>;
  };
  review: {
    recentWrongAnswers: Array<{
      id: string;
      memo: string | null;
      imagePath: string | null;
      categories: Array<{
        key: string;
        labelKo: string;
      }>;
      attemptItem: {
        problemNo: number;
        attemptDate: string;
      };
    }>;
  };
  summary: {
    totalAttempts: number;
    totalItems: number;
    hasData: boolean;
  };
  nextAction: {
    label: string;
    description: string;
  };
};

type TrendsResponse = {
  points: Array<{
    weekStart: string;
    weekEnd: string;
    totalItems: number;
    correctItems: number;
    accuracyPct: number;
    masteryScorePct: number;
  }>;
};

type ApiErrorPayload = {
  error?: {
    message?: string;
  };
};

type StudyBoardResponse = {
  dailyMission: {
    practiceSetId: string;
    title: string;
    unitName: string;
    problemCount: number;
    progressStatus: "planned" | "in_progress" | "review_needed" | "completed";
    reason: string;
  } | null;
  progressSummary: Record<"planned" | "in_progress" | "review_needed" | "completed", number>;
  latestFeedback: Array<{
    attemptId: string;
    practiceSetTitle: string;
    unitName: string | null;
    feedback: string;
    progressStatus: "planned" | "in_progress" | "review_needed" | "completed" | null;
    reviewedAt: string | null;
  }>;
};

function toApiErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  return (payload as ApiErrorPayload).error?.message ?? fallback;
}

function formatAttemptDate(value: string) {
  return value.slice(0, 10);
}

export function StudentDashboardPanel() {
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [studyBoard, setStudyBoard] = useState<StudyBoardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrorMessage("");

      try {
        const [overviewResponse, trendsResponse, studyBoardResponse] = await Promise.all([
          fetch("/api/v1/student/dashboard/overview"),
          fetch("/api/v1/student/dashboard/trends"),
          fetch("/api/v1/student/study/board"),
        ]);
        const [overviewPayload, trendsPayload, studyBoardPayload] = await Promise.all([
          overviewResponse.json().catch(() => null),
          trendsResponse.json().catch(() => null),
          studyBoardResponse.json().catch(() => null),
        ]);

        if (!overviewResponse.ok) {
          throw new Error(toApiErrorMessage(overviewPayload, "학생 대시보드 개요를 불러오지 못했습니다."));
        }

        if (!trendsResponse.ok) {
          throw new Error(toApiErrorMessage(trendsPayload, "학생 대시보드 추이를 불러오지 못했습니다."));
        }

        if (!studyBoardResponse.ok) {
          throw new Error(toApiErrorMessage(studyBoardPayload, "학생 학습 보드를 불러오지 못했습니다."));
        }

        if (!cancelled) {
          setOverview(overviewPayload as OverviewResponse);
          setTrends(trendsPayload as TrendsResponse);
          setStudyBoard(studyBoardPayload as StudyBoardResponse);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "학생 대시보드를 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">학생 대시보드를 불러오는 중입니다.</p>;
  }

  if (errorMessage) {
    return <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{errorMessage}</p>;
  }

  if (!overview) {
    return null;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
        <p className="font-mono text-xs tracking-[0.26em] text-teal-700 uppercase">Today</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-950">
          {overview.student.name} 학생, 오늘은 {overview.today.totalItems}문항을 확인했습니다.
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          최근 7일 정확도는 {overview.recent7Days.accuracyPct.toFixed(1)}%입니다. 지금은{" "}
          {overview.focus.weakUnits[0]?.unitName ?? "기초 복습"}에 가장 먼저 집중하는 구성이 적절합니다.
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <MetricCard
          label="오늘의 학습 상태"
          value={`${overview.today.correctItems}/${overview.today.totalItems}`}
          description={`${overview.today.date} 정확도 ${overview.today.accuracyPct.toFixed(1)}%`}
        />
        <MetricCard
          label="최근 7일 정확도"
          value={`${overview.recent7Days.accuracyPct.toFixed(1)}%`}
          description={`${overview.recent7Days.totalItems}문항 기준`}
        />
        <MetricCard
          label="누적 학습량"
          value={`${overview.summary.totalItems}문항`}
          description={`총 시도 ${overview.summary.totalAttempts}회`}
        />
      </section>

      <section className="grid gap-3 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">학습 런치패드</h3>
              <p className="mt-1 text-xs text-slate-500">오늘의 미션, 진도 상태, 오답 정리를 바로 이어서 진행합니다.</p>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              리뷰 필요 {studyBoard?.progressSummary.review_needed ?? 0}개
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Link
              href={studyBoard?.dailyMission ? `/student/study/session?practiceSetId=${studyBoard.dailyMission.practiceSetId}` : "/student/study/session"}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:border-slate-300"
            >
              <p className="text-xs font-medium text-slate-500">오늘의 연습</p>
              <p className="mt-2 text-base font-semibold text-slate-950">
                {studyBoard?.dailyMission?.title ?? "학습 세트 선택"}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {studyBoard?.dailyMission
                  ? `${studyBoard.dailyMission.unitName} · ${studyBoard.dailyMission.problemCount}문항`
                  : "오늘의 미션이 없으면 원하는 단원 연습 세트를 바로 시작합니다."}
              </p>
            </Link>

            <Link href="/student/progress" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:border-slate-300">
              <p className="text-xs font-medium text-slate-500">진도 / 개념</p>
              <p className="mt-2 text-base font-semibold text-slate-950">
                완료 {studyBoard?.progressSummary.completed ?? 0}개 / 진행중 {studyBoard?.progressSummary.in_progress ?? 0}개
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">단원 상태를 보고 개념 자료와 연결된 연습 세트로 이동합니다.</p>
            </Link>

            <Link href="/student/wrong-answers" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:border-slate-300">
              <p className="text-xs font-medium text-slate-500">학생 오답노트</p>
              <p className="mt-2 text-base font-semibold text-slate-950">
                최근 피드백 {studyBoard?.latestFeedback.length ?? 0}건
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">사진과 메모를 정리하고 보호자 피드백을 다시 확인합니다.</p>
            </Link>
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-slate-950 p-5 shadow-sm">
          <p className="font-mono text-xs tracking-[0.26em] text-teal-300 uppercase">Latest Feedback</p>
          {studyBoard?.latestFeedback.length ? (
            <div className="mt-4 space-y-3">
              {studyBoard.latestFeedback.map((feedback) => (
                <div key={feedback.attemptId} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                  <p className="text-sm font-semibold text-white">{feedback.practiceSetTitle}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {feedback.unitName ?? "단원 미확인"}
                    {feedback.progressStatus ? ` · ${getProgressStatusLabel(feedback.progressStatus)}` : ""}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{feedback.feedback}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-slate-300">아직 보호자 피드백이 없습니다. 학습 세션을 제출하면 여기에서 다시 확인할 수 있습니다.</p>
          )}
        </article>
      </section>

      <section className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">최근 4주 성취 추이</h3>
          <p className="mt-1 text-xs text-slate-500">정확도와 마스터리 점수를 주 단위로 확인합니다.</p>
          <div className="mt-4">
            <TrendsLineChart points={trends?.points ?? []} />
          </div>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">지금 집중할 약점 1~3개</h3>
          <p className="mt-1 text-xs text-slate-500">최근 30일 기준으로 정답률이 낮은 단원을 우선 표시합니다.</p>
          <div className="mt-4">
            <WeaknessTable weakUnits={overview.focus.weakUnits} />
          </div>
        </article>
      </section>

      <section className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">최근 오답 복습 카드</h3>
          <div className="mt-4 space-y-3">
            {overview.review.recentWrongAnswers.length ? (
              overview.review.recentWrongAnswers.map((wrongAnswer) => (
                <div key={wrongAnswer.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">문항 {wrongAnswer.attemptItem.problemNo}</p>
                    <p className="text-xs text-slate-500">{formatAttemptDate(wrongAnswer.attemptItem.attemptDate)}</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {wrongAnswer.memo ?? "아직 메모가 없습니다. 보호자와 함께 다시 보며 실수 원인을 정리해 보세요."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {wrongAnswer.categories.length ? (
                      wrongAnswer.categories.map((category) => (
                        <span
                          key={`${wrongAnswer.id}-${category.key}`}
                          className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900"
                        >
                          {category.labelKo}
                        </span>
                      ))
                    ) : (
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
                        아직 카테고리 미분류
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                아직 표시할 오답 복습 카드가 없습니다.
              </p>
            )}
          </div>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-950 p-5 shadow-sm">
          <p className="font-mono text-xs tracking-[0.26em] text-teal-300 uppercase">Next Action</p>
          <h3 className="mt-3 text-lg font-semibold text-white">{overview.nextAction.label}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-300">{overview.nextAction.description}</p>
        </article>
      </section>
    </div>
  );
}
