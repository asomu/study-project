"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CategoryDistributionChart } from "@/components/dashboard/category-distribution-chart";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ProgressComparison } from "@/components/dashboard/progress-comparison";
import { TrendsLineChart } from "@/components/dashboard/trends-line-chart";
import { WeaknessTable } from "@/components/dashboard/weakness-table";

type Student = {
  id: string;
  name: string;
  schoolLevel: "elementary" | "middle" | "high";
  grade: number;
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

export function DashboardPanel() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [asOfDate, setAsOfDate] = useState(todayDateOnly());
  const [weaknessPeriod, setWeaknessPeriod] = useState<"weekly" | "monthly">("weekly");
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [weakness, setWeakness] = useState<WeaknessResponse | null>(null);
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [message, setMessage] = useState("");

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedStudentId) ?? null,
    [selectedStudentId, students],
  );

  const hasAnyData = (overview?.summary.totalItems ?? 0) > 0;

  const loadStudents = useCallback(async () => {
    const response = await fetch("/api/v1/students");
    const payload = (await response.json().catch(() => null)) as { students?: Student[] } | ApiErrorPayload | null;

    if (!response.ok) {
      throw new Error(toApiErrorMessage(payload, "학생 목록을 불러오지 못했습니다."));
    }

    const items = (payload as { students?: Student[] })?.students ?? [];
    setStudents(items);

    if (!selectedStudentId && items[0]) {
      setSelectedStudentId(items[0].id);
    }
  }, [selectedStudentId]);

  const loadDashboard = useCallback(
    async (studentId: string) => {
      if (!studentId) {
        return;
      }

      setLoading(true);
      setErrorMessage("");

      try {
        const trendRangeStart = addDaysToDateOnly(asOfDate, -27);

        const [overviewResponse, weaknessResponse, trendsResponse] = await Promise.all([
          fetch(`/api/v1/dashboard/overview?${new URLSearchParams({ studentId, date: asOfDate }).toString()}`),
          fetch(`/api/v1/dashboard/weakness?${new URLSearchParams({ studentId, period: weaknessPeriod }).toString()}`),
          fetch(
            `/api/v1/dashboard/trends?${new URLSearchParams({
              studentId,
              rangeStart: trendRangeStart,
              rangeEnd: asOfDate,
            }).toString()}`,
          ),
        ]);

        const [overviewPayload, weaknessPayload, trendsPayload] = await Promise.all([
          overviewResponse.json().catch(() => null),
          weaknessResponse.json().catch(() => null),
          trendsResponse.json().catch(() => null),
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

        setOverview(overviewPayload as OverviewResponse);
        setWeakness(weaknessPayload as WeaknessResponse);
        setTrends(trendsPayload as TrendsResponse);
        setMessage("대시보드 지표를 최신 데이터로 갱신했습니다.");
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
    if (!selectedStudentId) {
      return;
    }

    loadDashboard(selectedStudentId).catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : "대시보드 데이터를 불러오지 못했습니다.");
    });
  }, [asOfDate, loadDashboard, selectedStudentId, weaknessPeriod]);

  return (
    <div className="space-y-6">
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
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
