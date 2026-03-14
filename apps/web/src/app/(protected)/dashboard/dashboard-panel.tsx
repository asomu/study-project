"use client";

import Link from "next/link";
import { StudyProgressStatus } from "@prisma/client";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CategoryDistributionChart } from "@/components/dashboard/category-distribution-chart";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ProgressComparison } from "@/components/dashboard/progress-comparison";
import { TrendsLineChart } from "@/components/dashboard/trends-line-chart";
import { WeaknessTable } from "@/components/dashboard/weakness-table";
import { ProgressStatusPill } from "@/components/study/progress-status-pill";

type Student = {
  id: string;
  name: string;
  schoolLevel: "elementary" | "middle" | "high";
  grade: number;
  loginUserId?: string | null;
};

type OverviewResponse = {
  progress: {
    recommendedPct: number;
    actualPct: number;
    coveredUnits: number;
    totalUnits: number;
  };
  mastery: {
    overallScorePct: number;
    recentAccuracyPct: number;
    difficultyWeightedAccuracyPct: number;
  };
  summary: {
    totalAttempts: number;
    totalItems: number;
    wrongAnswers: number;
    asOfDate: string;
  };
};

type WeaknessResponse = {
  weakUnits: Array<{
    curriculumNodeId: string;
    unitName: string;
    attempts: number;
    accuracyPct: number;
    wrongCount: number;
  }>;
  categoryDistribution: Array<{
    key: string;
    labelKo: string;
    count: number;
    ratio: number;
  }>;
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

type StudyOverviewResponse = {
  student: Student;
  summary: {
    pendingReviews: number;
    reviewNeededUnits: number;
    inProgressUnits: number;
    recentStudyMinutes7d: number;
    submittedSessions7d: number;
  };
  progressSummary: Record<StudyProgressStatus, number>;
  recommendedActions: Array<{
    kind: string;
    title: string;
    description: string;
    href?: string;
    sessionId?: string;
    curriculumNodeId?: string;
    practiceSetId?: string;
  }>;
  reviewQueuePreview: Array<{
    attemptId: string;
    submittedAt: string;
    elapsedSeconds: number | null;
    wrongItems: number;
    hasReview: boolean;
    practiceSetTitle: string | null;
    unitName: string | null;
  }>;
  attentionUnits: Array<{
    curriculumNodeId: string;
    unitName: string;
    status: StudyProgressStatus;
    lastStudiedAt: string | null;
    reviewedAt: string | null;
    hasConcept: boolean;
    practiceSetId: string | null;
    practiceSetTitle: string | null;
  }>;
};

type ApiErrorPayload = {
  error?: {
    message?: string;
  };
};

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysToDateOnly(value: string, days: number) {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function toApiErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  return (payload as ApiErrorPayload).error?.message ?? fallback;
}

function formatStudyMinutes(minutes: number) {
  if (minutes <= 0) {
    return "0분";
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (hours <= 0) {
    return `${minutes}분`;
  }

  if (remainder === 0) {
    return `${hours}시간`;
  }

  return `${hours}시간 ${remainder}분`;
}

function formatElapsedSeconds(seconds: number | null) {
  if (!seconds || seconds <= 0) {
    return "0분";
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes <= 0) {
    return `${seconds}초`;
  }

  const remainderSeconds = seconds % 60;

  if (remainderSeconds === 0) {
    return `${minutes}분`;
  }

  return `${minutes}분 ${remainderSeconds}초`;
}

function formatDateLabel(value: string | null) {
  return value ? value.slice(0, 10) : "-";
}

export function DashboardPanel() {
  const searchParams = useSearchParams();
  const requestedStudentId = searchParams.get("studentId") ?? "";
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [asOfDate, setAsOfDate] = useState(todayDateOnly());
  const [weaknessPeriod, setWeaknessPeriod] = useState<"weekly" | "monthly">("weekly");
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [weakness, setWeakness] = useState<WeaknessResponse | null>(null);
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [studyOverview, setStudyOverview] = useState<StudyOverviewResponse | null>(null);
  const [hasInitializedStudentSelection, setHasInitializedStudentSelection] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [message, setMessage] = useState("");

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedStudentId) ?? null,
    [selectedStudentId, students],
  );
  const activeStudentCount = students.filter((student) => Boolean(student.loginUserId)).length;
  const inactiveStudentCount = students.length - activeStudentCount;

  const hasAnyData = (overview?.summary.totalItems ?? 0) > 0;

  const loadStudents = useCallback(async () => {
    const response = await fetch("/api/v1/students");
    const payload = (await response.json().catch(() => null)) as { students?: Student[] } | ApiErrorPayload | null;

    if (!response.ok) {
      throw new Error(toApiErrorMessage(payload, "학생 목록을 불러오지 못했습니다."));
    }

    const items = (payload as { students?: Student[] })?.students ?? [];
    setStudents(items);
  }, []);

  const loadDashboard = useCallback(
    async (studentId: string) => {
      if (!studentId) {
        return;
      }

      setLoading(true);
      setErrorMessage("");

      try {
        const trendRangeStart = addDaysToDateOnly(asOfDate, -27);

        const [overviewResponse, weaknessResponse, trendsResponse, studyOverviewResponse] = await Promise.all([
          fetch(`/api/v1/dashboard/overview?${new URLSearchParams({ studentId, date: asOfDate }).toString()}`),
          fetch(`/api/v1/dashboard/weakness?${new URLSearchParams({ studentId, period: weaknessPeriod }).toString()}`),
          fetch(
            `/api/v1/dashboard/trends?${new URLSearchParams({
              studentId,
              rangeStart: trendRangeStart,
              rangeEnd: asOfDate,
            }).toString()}`,
          ),
          fetch(`/api/v1/dashboard/study-overview?${new URLSearchParams({ studentId, date: asOfDate }).toString()}`),
        ]);

        const [overviewPayload, weaknessPayload, trendsPayload, studyOverviewPayload] = await Promise.all([
          overviewResponse.json().catch(() => null),
          weaknessResponse.json().catch(() => null),
          trendsResponse.json().catch(() => null),
          studyOverviewResponse.json().catch(() => null),
        ]);

        if (!overviewResponse.ok) {
          throw new Error(toApiErrorMessage(overviewPayload, "개요 데이터를 불러오지 못했습니다."));
        }

        if (!weaknessResponse.ok) {
          throw new Error(toApiErrorMessage(weaknessPayload, "약점 데이터를 불러오지 못했습니다."));
        }

        if (!trendsResponse.ok) {
          throw new Error(toApiErrorMessage(trendsPayload, "추이 데이터를 불러오지 못했습니다."));
        }

        if (!studyOverviewResponse.ok) {
          throw new Error(toApiErrorMessage(studyOverviewPayload, "학습 인사이트 데이터를 불러오지 못했습니다."));
        }

        setOverview(overviewPayload as OverviewResponse);
        setWeakness(weaknessPayload as WeaknessResponse);
        setTrends(trendsPayload as TrendsResponse);
        setStudyOverview(studyOverviewPayload as StudyOverviewResponse);
        setMessage("대시보드와 학습 인사이트를 최신 데이터로 갱신했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [asOfDate, weaknessPeriod],
  );

  useEffect(() => {
    loadStudents().catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : "학생 목록을 불러오지 못했습니다.");
    });
  }, [loadStudents]);

  useEffect(() => {
    if (!students.length) {
      return;
    }

    if (!hasInitializedStudentSelection) {
      if (requestedStudentId && students.some((student) => student.id === requestedStudentId)) {
        setSelectedStudentId(requestedStudentId);
      } else if (students[0]) {
        setSelectedStudentId(students[0].id);
      }

      setHasInitializedStudentSelection(true);
      return;
    }

    if (selectedStudentId && students.some((student) => student.id === selectedStudentId)) {
      return;
    }

    if (students[0]) {
      setSelectedStudentId(students[0].id);
    }
  }, [hasInitializedStudentSelection, requestedStudentId, selectedStudentId, students]);

  useEffect(() => {
    if (!selectedStudentId) {
      return;
    }

    loadDashboard(selectedStudentId).catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : "대시보드 데이터를 불러오지 못했습니다.");
    });
  }, [asOfDate, loadDashboard, selectedStudentId, weaknessPeriod]);

  return (
    <div className="space-y-6">
      <section className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="font-mono text-xs tracking-[0.26em] text-teal-700 uppercase">Guardian Control</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">학생 학습 흐름과 계정 상태를 함께 관리합니다</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            보호자 대시보드는 분석 화면을 유지하면서 학생 계정 연결 상태까지 보여줍니다. 아직 미활성 학생이 있으면
            학생 관리 화면에서 초대코드를 발급하세요.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/students/manage"
              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
            >
              학생 관리로 이동
            </Link>
            <Link
              href="/records/new"
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-400 hover:text-sky-700"
            >
              학습 기록 입력
            </Link>
          </div>
        </article>
        <article className="rounded-[1.75rem] border border-slate-200 bg-slate-950 p-5 shadow-sm">
          <p className="font-mono text-xs tracking-[0.26em] text-teal-300 uppercase">Account Status</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-slate-400">활성 학생 계정</p>
              <p className="mt-2 text-2xl font-semibold text-white">{activeStudentCount}명</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-slate-400">미활성 학생 계정</p>
              <p className="mt-2 text-2xl font-semibold text-white">{inactiveStudentCount}명</p>
            </div>
          </div>
        </article>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">대시보드 필터</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <label className="space-y-1 text-sm text-slate-700">
            <span>학생</span>
            <select
              value={selectedStudentId}
              onChange={(event) => setSelectedStudentId(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="">학생 선택</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>기준일</span>
            <input
              type="date"
              value={asOfDate}
              onChange={(event) => setAsOfDate(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>약점 기간</span>
            <select
              value={weaknessPeriod}
              onChange={(event) => setWeaknessPeriod(event.target.value as "weekly" | "monthly")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="weekly">최근 7일</option>
              <option value="monthly">최근 30일</option>
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                loadDashboard(selectedStudentId).catch((error: unknown) => {
                  setErrorMessage(error instanceof Error ? error.message : "대시보드 데이터를 불러오지 못했습니다.");
                });
              }}
              className="w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              {loading ? "갱신 중..." : "대시보드 갱신"}
            </button>
          </div>
        </div>
        {selectedStudent ? (
          <p className="mt-2 text-xs text-slate-500">
            선택 학생: {selectedStudent.name} ({selectedStudent.schoolLevel}-{selectedStudent.grade}학년)
          </p>
        ) : null}
      </section>

      {errorMessage ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p> : null}
      {message ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}

      {studyOverview ? (
        <section className="space-y-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs tracking-[0.26em] text-teal-700 uppercase">Study Insight</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">지금 보호자가 개입해야 할 학습 흐름</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                최근 7일 학습량, 리뷰 대기 제출, 단원 상태를 한 화면에서 보고 바로 리뷰 큐로 이동할 수 있습니다.
              </p>
            </div>
            <Link
              href={`/study/reviews?studentId=${selectedStudentId}`}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-400 hover:text-sky-700"
            >
              학습 리뷰 큐 열기
            </Link>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="리뷰 대기 세션"
              value={`${studyOverview.summary.pendingReviews}건`}
              description="제출은 끝났지만 아직 보호자 피드백이 없는 세션"
            />
            <MetricCard
              label="복습 필요 단원"
              value={`${studyOverview.summary.reviewNeededUnits}개`}
              description="학생이 review_needed 상태로 남아 있는 현재 학기 단원"
            />
            <MetricCard
              label="최근 7일 학습 시간"
              value={formatStudyMinutes(studyOverview.summary.recentStudyMinutes7d)}
              description="제출된 practice session의 풀이 시간 합계"
            />
            <MetricCard
              label="최근 7일 제출 세션"
              value={`${studyOverview.summary.submittedSessions7d}회`}
              description="최근 7일 동안 제출 완료된 학습 세션 수"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">지금 필요한 액션</h3>
                  <p className="mt-1 text-xs text-slate-500">리뷰 대기, 복습 필요, 정체 단원, 미시작 단원 순서로 추천합니다.</p>
                </div>
                <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                  planned {studyOverview.progressSummary.planned} / in_progress {studyOverview.progressSummary.in_progress} / review_needed{" "}
                  {studyOverview.progressSummary.review_needed}
                </div>
              </div>
              <div className="mt-3 grid gap-3">
                {studyOverview.recommendedActions.length ? (
                  studyOverview.recommendedActions.map((action) => (
                    <Link
                      key={`${action.kind}:${action.sessionId ?? action.curriculumNodeId ?? action.practiceSetId ?? action.title}`}
                      href={action.href ?? `/study/reviews?studentId=${selectedStudentId}`}
                      className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-sky-300 hover:shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{action.title}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{action.description}</p>
                        </div>
                        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">리뷰로 이동</span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                    지금 당장 개입이 필요한 액션은 없습니다. 현재 흐름이 안정적으로 유지되고 있습니다.
                  </div>
                )}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">리뷰 대기 미리보기</h3>
                  <p className="mt-1 text-xs text-slate-500">기존 리뷰 큐 정렬과 같은 순서로 상위 제출만 요약합니다.</p>
                </div>
                <Link href={`/study/reviews?studentId=${selectedStudentId}`} className="text-xs font-semibold text-sky-700 hover:text-sky-800">
                  전체 리뷰 보기
                </Link>
              </div>
              <div className="mt-3 grid gap-3">
                {studyOverview.reviewQueuePreview.length ? (
                  studyOverview.reviewQueuePreview.map((item) => (
                    <Link
                      key={item.attemptId}
                      href={`/study/reviews?studentId=${selectedStudentId}`}
                      className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-sky-300 hover:shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.practiceSetTitle ?? "학습 세션"}</p>
                          <p className="mt-1 text-xs text-slate-500">{item.unitName ?? "단원 미확인"}</p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            item.hasReview ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
                          }`}
                        >
                          {item.hasReview ? "리뷰 완료" : "리뷰 대기"}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-slate-600">
                        제출일 {formatDateLabel(item.submittedAt)} · 풀이 시간 {formatElapsedSeconds(item.elapsedSeconds)} · 오답 {item.wrongItems}개
                      </p>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                    아직 제출된 학습 세션이 없습니다. 학생이 연습 세트를 제출하면 여기서 바로 확인할 수 있습니다.
                  </div>
                )}
              </div>
            </article>
          </div>

          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">단원 상태 주의 목록</h3>
                <p className="mt-1 text-xs text-slate-500">완료 단원을 제외하고, 복습 필요 {"->"} 학습 중 {"->"} 예정 순서로 정렬합니다.</p>
              </div>
              <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                완료 {studyOverview.progressSummary.completed}개
              </div>
            </div>
            {studyOverview.attentionUnits.length ? (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="py-2 pr-4 font-medium">단원</th>
                      <th className="py-2 pr-4 font-medium">상태</th>
                      <th className="py-2 pr-4 font-medium">최근 학습</th>
                      <th className="py-2 pr-4 font-medium">최근 리뷰</th>
                      <th className="py-2 pr-4 font-medium">연결 리소스</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {studyOverview.attentionUnits.map((item) => (
                      <tr key={item.curriculumNodeId}>
                        <td className="py-3 pr-4">
                          <p className="font-medium text-slate-900">{item.unitName}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <ProgressStatusPill status={item.status} />
                        </td>
                        <td className="py-3 pr-4">{formatDateLabel(item.lastStudiedAt)}</td>
                        <td className="py-3 pr-4">{formatDateLabel(item.reviewedAt)}</td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                              {item.practiceSetTitle ?? "연습 세트 없음"}
                            </span>
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                              개념 {item.hasConcept ? "있음" : "없음"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                현재 완료 외에 주의가 필요한 단원이 없습니다.
              </div>
            )}
          </article>
        </section>
      ) : null}

      {overview ? (
        <>
          <section className="grid gap-3 md:grid-cols-3">
            <MetricCard
              label="종합 점수"
              value={`${overview.mastery.overallScorePct.toFixed(1)}%`}
              description="최근 정확도·일관성·난이도 가중 정확도를 반영"
            />
            <MetricCard
              label="최근 4주 정확도"
              value={`${overview.mastery.recentAccuracyPct.toFixed(1)}%`}
              description={`기준일 ${overview.summary.asOfDate} 기준 최근 28일`}
            />
            <MetricCard
              label="누적 오답 수"
              value={`${overview.summary.wrongAnswers}건`}
              description={`총 시도 ${overview.summary.totalAttempts}회 / 총 문항 ${overview.summary.totalItems}개`}
            />
          </section>

          <section className="grid gap-3 lg:grid-cols-2">
            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">진도 대비 달성률</h3>
              <p className="mt-1 text-xs text-slate-500">학기 경과일 기반 권장 진도와 실제 커버 단원 비율 비교</p>
              <div className="mt-3">
                <ProgressComparison
                  recommendedPct={overview.progress.recommendedPct}
                  actualPct={overview.progress.actualPct}
                  coveredUnits={overview.progress.coveredUnits}
                  totalUnits={overview.progress.totalUnits}
                />
              </div>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">주간 성취 추이 (최근 4주)</h3>
              <p className="mt-1 text-xs text-slate-500">정확도와 마스터리 점수를 주 단위로 확인합니다.</p>
              <div className="mt-3">
                <TrendsLineChart points={trends?.points ?? []} />
              </div>
            </article>
          </section>

          <section className="grid gap-3 lg:grid-cols-2">
            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">약점 단원 Top 5</h3>
              <p className="mt-1 text-xs text-slate-500">정답률 오름차순, 동률이면 시도수 많은 단원 우선</p>
              <div className="mt-3">
                <WeaknessTable weakUnits={weakness?.weakUnits ?? []} />
              </div>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">오답 유형 분포</h3>
              <p className="mt-1 text-xs text-slate-500">기간 내 오답 카테고리 비중</p>
              <div className="mt-3">
                <CategoryDistributionChart items={weakness?.categoryDistribution ?? []} />
              </div>
            </article>
          </section>

          {!hasAnyData ? (
            <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">아직 집계할 학습 데이터가 없습니다.</h3>
              <p className="mt-2 text-sm text-slate-600">
                기록 입력 화면에서 문제집/시도/문항을 먼저 등록하면 대시보드 카드와 차트가 자동으로 채워집니다.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Link href="/records/new" className="text-sm font-semibold text-sky-700 hover:text-sky-800">
                  기록 입력으로 이동
                </Link>
                <Link href="/wrong-answers/manage" className="text-sm font-semibold text-sky-700 hover:text-sky-800">
                  오답 관리로 이동
                </Link>
                {studyOverview?.summary.pendingReviews ? (
                  <Link
                    href={`/study/reviews?studentId=${selectedStudentId}`}
                    className="text-sm font-semibold text-sky-700 hover:text-sky-800"
                  >
                    학습 리뷰로 이동
                  </Link>
                ) : null}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
