"use client";

import { PracticeProblemType, StudyProgressStatus } from "@prisma/client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ProgressStatusPill, getProgressStatusLabel } from "@/components/study/progress-status-pill";
import { StudyCanvas } from "@/components/study/study-canvas";

type StudyBoardResponse = {
  dailyMission: {
    practiceSetId: string;
    title: string;
    unitName: string;
    problemCount: number;
    progressStatus: StudyProgressStatus;
    reason: string;
  } | null;
  practiceSets: Array<{
    id: string;
    title: string;
    description: string | null;
    curriculumNodeId: string;
    unitName: string;
    problemCount: number;
    progressStatus: StudyProgressStatus;
    skillTags: string[];
  }>;
};

type SessionSummary = {
  id: string;
  startedAt: string | null;
  submittedAt: string | null;
  elapsedSeconds: number | null;
  practiceSet: {
    id: string;
    title: string;
    unitName: string;
  } | null;
  result: {
    totalProblems: number;
    correctItems: number;
    wrongItems: number;
  };
  review: {
    feedback: string;
    progressStatus: StudyProgressStatus;
    reviewedAt: string;
  } | null;
};

type ActiveSession = {
  id: string;
  startedAt: string | null;
  practiceSet: {
    id: string;
    title: string;
    description: string | null;
    unitName: string;
    problems: Array<{
      id: string;
      problemNo: number;
      type: PracticeProblemType;
      prompt: string;
      choices: string[] | null;
      explanation: string | null;
      difficulty: number;
      skillTags: string[];
    }>;
  };
};

type SessionResponse = {
  session: ActiveSession;
};

type SubmitResponse = {
  session: SessionSummary;
  result: {
    totalProblems: number;
    correctItems: number;
    wrongItems: number;
    progressStatus: StudyProgressStatus;
  };
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

function formatElapsed(seconds: number) {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");

  return `${mins}:${secs}`;
}

export function StudySessionPanel() {
  const [board, setBoard] = useState<StudyBoardResponse | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [answerByProblemId, setAnswerByProblemId] = useState<Record<string, string>>({});
  const [canvasImageDataUrl, setCanvasImageDataUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [lastResult, setLastResult] = useState<SubmitResponse["result"] | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const autoStartedRef = useRef(false);

  async function load() {
    setLoading(true);

    try {
      const [boardResponse, sessionsResponse] = await Promise.all([
        fetch("/api/v1/student/study/board"),
        fetch("/api/v1/student/study/sessions"),
      ]);
      const [boardPayload, sessionsPayload] = await Promise.all([
        boardResponse.json().catch(() => null),
        sessionsResponse.json().catch(() => null),
      ]);

      if (!boardResponse.ok) {
        throw new Error(toApiErrorMessage(boardPayload, "학습 보드를 불러오지 못했습니다."));
      }

      if (!sessionsResponse.ok) {
        throw new Error(toApiErrorMessage(sessionsPayload, "학습 세션 목록을 불러오지 못했습니다."));
      }

      setBoard(boardPayload as StudyBoardResponse);
      setSessions(((sessionsPayload as { sessions?: SessionSummary[] }).sessions ?? []).filter(Boolean));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "학습 보드를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  async function startSession(practiceSetId: string) {
    if (!practiceSetId.trim()) {
      setErrorMessage("시작할 학습 세트를 찾지 못했습니다.");
      return;
    }

    setErrorMessage("");
    setMessage("");
    setLastResult(null);

    const response = await fetch("/api/v1/student/study/sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        practiceSetId,
      }),
    });
    const payload = (await response.json().catch(() => null)) as SessionResponse | ApiErrorPayload | null;

    if (!response.ok) {
      setErrorMessage(toApiErrorMessage(payload, "학습 세션을 시작하지 못했습니다."));
      return;
    }

    const nextSession = (payload as SessionResponse).session;
    setActiveSession(nextSession);
    setElapsedSeconds(0);
    setAnswerByProblemId({});
    setCanvasImageDataUrl("");
    setMessage(`${nextSession.practiceSet.title} 세션을 시작했습니다.`);
  }

  useEffect(() => {
    if (!board || autoStartedRef.current) {
      return;
    }

    const practiceSetId = new URLSearchParams(window.location.search).get("practiceSetId");

    if (!practiceSetId) {
      return;
    }

    autoStartedRef.current = true;
    startSession(practiceSetId).catch(() => undefined);
  }, [board]);

  useEffect(() => {
    if (!activeSession?.startedAt) {
      return;
    }

    const startedAt = new Date(activeSession.startedAt).getTime();
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.round((Date.now() - startedAt) / 1000)));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [activeSession?.id, activeSession?.startedAt]);

  const draftSessions = useMemo(
    () => sessions.filter((session) => !session.submittedAt && session.practiceSet),
    [sessions],
  );

  async function handleSubmit() {
    if (!activeSession) {
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    setMessage("");

    const response = await fetch(`/api/v1/student/study/sessions/${activeSession.id}/submit`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        elapsedSeconds,
        canvasImageDataUrl: canvasImageDataUrl || undefined,
        answers: activeSession.practiceSet.problems.map((problem) => ({
          practiceProblemId: problem.id,
          studentAnswer: answerByProblemId[problem.id] ?? "",
        })),
      }),
    });
    const payload = (await response.json().catch(() => null)) as SubmitResponse | ApiErrorPayload | null;

    if (!response.ok) {
      setErrorMessage(toApiErrorMessage(payload, "학습 세션 제출에 실패했습니다."));
      setSubmitting(false);
      return;
    }

    const submitPayload = payload as SubmitResponse;
    window.localStorage.removeItem(`study-canvas-${activeSession.id}`);
    setLastResult(submitPayload.result);
    setActiveSession(null);
    setCanvasImageDataUrl("");
    setAnswerByProblemId({});
    setMessage("세션을 제출했습니다. 보호자 피드백을 기다리는 중입니다.");
    setSubmitting(false);
    await load();
  }

  if (loading) {
    return <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">학습 보드를 불러오는 중입니다.</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
        <p className="font-mono text-xs tracking-[0.26em] text-teal-700 uppercase">Daily Mission</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-950">
          {board?.dailyMission ? board.dailyMission.title : "오늘 추천 학습이 아직 없습니다."}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {board?.dailyMission
            ? `${board.dailyMission.unitName} · ${board.dailyMission.problemCount}문항 · ${board.dailyMission.reason}`
            : "보호자나 학생이 첫 학습 세션을 시작하면 여기에 오늘의 추천이 나타납니다."}
        </p>
        {board?.dailyMission ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                startSession(board.dailyMission!.practiceSetId).catch(() => undefined);
              }}
              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            >
              오늘 미션 시작
            </button>
            <ProgressStatusPill status={board.dailyMission.progressStatus} />
          </div>
        ) : null}
      </section>

      {errorMessage ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p> : null}
      {message ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}

      <section className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">추천 연습 세트</h3>
              <p className="mt-1 text-xs text-slate-500">기초 실수 감소용 내장 문제세트를 바로 시작할 수 있습니다.</p>
            </div>
            <Link href="/student/progress" className="text-sm font-semibold text-sky-700 hover:text-sky-800">
              진도/개념 보기
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {board?.practiceSets.map((practiceSet) => (
              <div key={practiceSet.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{practiceSet.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {practiceSet.unitName} · {practiceSet.problemCount}문항
                    </p>
                    {practiceSet.description ? (
                      <p className="mt-2 text-sm leading-6 text-slate-600">{practiceSet.description}</p>
                    ) : null}
                  </div>
                  <ProgressStatusPill status={practiceSet.progressStatus} />
                </div>
                {practiceSet.skillTags.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {practiceSet.skillTags.map((tag) => (
                      <span
                        key={`${practiceSet.id}-${tag}`}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      startSession(practiceSet.id).catch(() => undefined);
                    }}
                    className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
                  >
                    이 세트 시작
                  </button>
                  <Link
                    href={`/student/progress?curriculumNodeId=${practiceSet.curriculumNodeId}`}
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
                  >
                    개념 확인
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-slate-950 p-5 shadow-sm">
          <p className="font-mono text-xs tracking-[0.26em] text-teal-300 uppercase">Resume</p>
          <h3 className="mt-3 text-lg font-semibold text-white">미제출 세션</h3>
          <div className="mt-4 space-y-3">
            {draftSessions.length ? (
              draftSessions.map((session) => (
                <div key={session.id} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                  <p className="text-sm font-semibold text-white">{session.practiceSet?.title}</p>
                  <p className="mt-1 text-xs text-slate-400">{session.practiceSet?.unitName}</p>
                  <button
                    type="button"
                    onClick={() => {
                      startSession(session.practiceSet?.id ?? "").catch(() => undefined);
                    }}
                    className="mt-3 rounded-full bg-teal-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-teal-300"
                  >
                    이어서 풀기
                  </button>
                </div>
              ))
            ) : (
              <p className="text-sm leading-6 text-slate-300">현재 이어서 풀 세션이 없습니다. 위 추천 세트에서 바로 시작하세요.</p>
            )}
          </div>
        </article>
      </section>

      {activeSession ? (
        <section className="space-y-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">{activeSession.practiceSet.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{activeSession.practiceSet.unitName}</p>
            </div>
            <div className="rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-800">
              타이머 {formatElapsed(elapsedSeconds)}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
            <div className="space-y-4">
              {activeSession.practiceSet.problems.map((problem) => (
                <article key={problem.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">문항 {problem.problemNo}</p>
                    <span className="text-xs text-slate-500">난이도 {problem.difficulty}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-700">{problem.prompt}</p>
                  {problem.type === "single_choice" ? (
                    <div className="mt-3 space-y-2">
                      {problem.choices?.map((choice) => (
                        <label key={`${problem.id}-${choice}`} className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="radio"
                            name={problem.id}
                            value={choice}
                            checked={answerByProblemId[problem.id] === choice}
                            onChange={(event) =>
                              setAnswerByProblemId((current) => ({
                                ...current,
                                [problem.id]: event.target.value,
                              }))
                            }
                          />
                          <span>{choice}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <label className="mt-3 block space-y-1 text-sm text-slate-700">
                      <span>답 입력</span>
                      <input
                        type="text"
                        value={answerByProblemId[problem.id] ?? ""}
                        onChange={(event) =>
                          setAnswerByProblemId((current) => ({
                            ...current,
                            [problem.id]: event.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-slate-300 px-3 py-2"
                      />
                    </label>
                  )}
                </article>
              ))}
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="text-sm font-semibold text-slate-900">풀이 캔버스</h4>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  문제 풀이를 적고 제출하면 PNG 1장으로 저장됩니다. 브라우저 새로고침 전까지는 임시 복구가 가능합니다.
                </p>
                <div className="mt-4">
                  <StudyCanvas key={activeSession.id} storageKey={`study-canvas-${activeSession.id}`} onChange={setCanvasImageDataUrl} />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="text-sm font-semibold text-slate-900">제출 전 확인</h4>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  답을 모두 입력하지 않아도 제출할 수 있지만, 빈칸은 오답으로 처리됩니다.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    handleSubmit().catch(() => undefined);
                  }}
                  disabled={submitting}
                  className="mt-4 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {submitting ? "제출 중..." : "세션 제출"}
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {lastResult ? (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-emerald-900">최근 제출 결과</h3>
          <p className="mt-2 text-sm leading-6 text-emerald-800">
            총 {lastResult.totalProblems}문항 중 {lastResult.correctItems}문항 정답, {lastResult.wrongItems}문항 오답입니다.
            현재 단원 상태는 {getProgressStatusLabel(lastResult.progressStatus)}로 기록되었습니다.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/student/wrong-answers" className="text-sm font-semibold text-emerald-800 hover:text-emerald-900">
              학생 오답노트 보기
            </Link>
            <Link href="/student/progress" className="text-sm font-semibold text-emerald-800 hover:text-emerald-900">
              진도/개념 보드 보기
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
