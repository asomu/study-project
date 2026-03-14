"use client";

import Link from "next/link";
import { StudyProgressStatus } from "@prisma/client";
import { useEffect, useState } from "react";
import { ProgressStatusPill, getProgressStatusLabel } from "@/components/study/progress-status-pill";

type BoardResponse = {
  progressSummary: Record<StudyProgressStatus, number>;
  progress: Array<{
    curriculumNodeId: string;
    unitName: string;
    status: StudyProgressStatus;
    note: string | null;
    lastStudiedAt: string | null;
    reviewedAt: string | null;
    hasConcept: boolean;
    practiceSetId: string | null;
    practiceSetTitle: string | null;
  }>;
};

type ConceptResponse = {
  lesson: {
    curriculumNodeId: string;
    unitName: string;
    title: string;
    summary: string | null;
    content: {
      blocks?: Array<
        | { type: "headline"; text: string }
        | { type: "visual_hint"; text: string }
        | { type: "steps"; items: string[] }
        | { type: "table"; rows: string[][] }
      >;
    };
  };
  recommendedPracticeSet: {
    id: string;
    title: string;
    problemCount: number;
  } | null;
};

type ApiErrorPayload = {
  error?: {
    message?: string;
  };
};

function toApiErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  return (payload as ApiErrorPayload).error?.message ?? fallback;
}

export function StudentProgressBoard() {
  const [board, setBoard] = useState<BoardResponse | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [concept, setConcept] = useState<ConceptResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [conceptLoading, setConceptLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadBoard() {
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/v1/student/study/board");
      const payload = (await response.json().catch(() => null)) as BoardResponse | ApiErrorPayload | null;

      if (!response.ok) {
        throw new Error(toApiErrorMessage(payload, "진도 보드를 불러오지 못했습니다."));
      }

      const nextBoard = payload as BoardResponse;
      setBoard(nextBoard);

      const presetNodeId = new URLSearchParams(window.location.search).get("curriculumNodeId");
      const targetNodeId =
        (presetNodeId && nextBoard.progress.find((item) => item.curriculumNodeId === presetNodeId)?.curriculumNodeId) ||
        nextBoard.progress.find((item) => item.hasConcept)?.curriculumNodeId ||
        nextBoard.progress[0]?.curriculumNodeId ||
        "";

      if (targetNodeId) {
        setSelectedNodeId(targetNodeId);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "진도 보드를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBoard().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!selectedNodeId) {
      return;
    }

    setConceptLoading(true);
    fetch(`/api/v1/student/study/concepts/${selectedNodeId}`)
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as ConceptResponse | ApiErrorPayload | null;

        if (response.status === 404) {
          setConcept(null);
          return;
        }

        if (!response.ok) {
          throw new Error(toApiErrorMessage(payload, "개념 자료를 불러오지 못했습니다."));
        }

        setConcept(payload as ConceptResponse);
      })
      .catch((error: unknown) => {
        setConcept(null);
        setErrorMessage(error instanceof Error ? error.message : "개념 자료를 불러오지 못했습니다.");
      })
      .finally(() => {
        setConceptLoading(false);
      });
  }, [selectedNodeId]);

  if (loading) {
    return <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">진도 보드를 불러오는 중입니다.</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
        <p className="font-mono text-xs tracking-[0.26em] text-teal-700 uppercase">Progress Board</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-950">단원 상태와 개념 자료를 한 화면에서 봅니다</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {(["planned", "in_progress", "review_needed", "completed"] as StudyProgressStatus[]).map((status) => (
            <div key={status} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-500">{getProgressStatusLabel(status)}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{board?.progressSummary[status] ?? 0}</p>
            </div>
          ))}
        </div>
      </section>

      {errorMessage ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p> : null}

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">현재 단원 상태</h3>
          <div className="mt-4 space-y-3">
            {board?.progress.map((item) => (
              <button
                key={item.curriculumNodeId}
                type="button"
                onClick={() => setSelectedNodeId(item.curriculumNodeId)}
                className={`w-full rounded-2xl border px-4 py-4 text-left ${
                  selectedNodeId === item.curriculumNodeId
                    ? "border-sky-300 bg-sky-50"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.unitName}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.lastStudiedAt ? `최근 학습 ${item.lastStudiedAt.slice(0, 10)}` : "아직 학습 기록 없음"}
                    </p>
                  </div>
                  <ProgressStatusPill status={item.status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.hasConcept ? (
                    <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
                      개념 자료 있음
                    </span>
                  ) : null}
                  {item.practiceSetTitle ? (
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                      {item.practiceSetTitle}
                    </span>
                  ) : null}
                </div>
                {item.note ? <p className="mt-3 text-sm leading-6 text-slate-600">{item.note}</p> : null}
              </button>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">선택 단원 개념 자료</h3>
          {conceptLoading ? <p className="mt-4 text-sm text-slate-500">개념 자료를 불러오는 중입니다.</p> : null}
          {!conceptLoading && !concept ? (
            <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              아직 선택한 단원의 개념 자료가 없습니다.
            </p>
          ) : null}
          {concept ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">{concept.lesson.unitName}</p>
                <h4 className="mt-2 text-lg font-semibold text-slate-950">{concept.lesson.title}</h4>
                {concept.lesson.summary ? <p className="mt-2 text-sm leading-6 text-slate-600">{concept.lesson.summary}</p> : null}
              </div>

              {(concept.lesson.content.blocks ?? []).map((block, index) => {
                if (block.type === "headline" || block.type === "visual_hint") {
                  return (
                    <div key={`${block.type}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-sm leading-7 text-slate-700">{block.text}</p>
                    </div>
                  );
                }

                if (block.type === "steps") {
                  return (
                    <div key={`${block.type}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <ol className="space-y-2 text-sm leading-6 text-slate-700">
                        {block.items.map((item, itemIndex) => (
                          <li key={`${item}-${itemIndex}`}>{itemIndex + 1}. {item}</li>
                        ))}
                      </ol>
                    </div>
                  );
                }

                if (block.type === "table") {
                  return (
                    <div key={`${block.type}-${index}`} className="overflow-hidden rounded-2xl border border-slate-200">
                      <table className="w-full text-sm text-slate-700">
                        <tbody>
                          {block.rows.map((row, rowIndex) => (
                            <tr key={`${rowIndex}-${row.join("-")}`} className="border-b border-slate-200 last:border-b-0">
                              <td className="bg-slate-50 px-4 py-3 font-medium">{row[0]}</td>
                              <td className="px-4 py-3">{row[1]}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                }

                return null;
              })}

              {concept.recommendedPracticeSet ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-semibold text-emerald-900">{concept.recommendedPracticeSet.title}</p>
                  <p className="mt-1 text-sm text-emerald-800">{concept.recommendedPracticeSet.problemCount}문항 연습 세트</p>
                  <Link
                    href={`/student/study/session?practiceSetId=${concept.recommendedPracticeSet.id}`}
                    className="mt-3 inline-flex rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    이 세트로 학습 시작
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}
        </article>
      </section>
    </div>
  );
}
