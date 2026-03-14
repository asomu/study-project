"use client";

import Image from "next/image";
import { StudyProgressStatus } from "@prisma/client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ProgressStatusPill, getProgressStatusLabel } from "@/components/study/progress-status-pill";

type Student = {
  id: string;
  name: string;
  schoolLevel: "elementary" | "middle" | "high";
  grade: number;
};

type ReviewQueueResponse = {
  reviewQueue: Array<{
    id: string;
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
    workArtifact: {
      imagePath: string;
    } | null;
  }>;
};

type ProgressResponse = {
  summary: Record<StudyProgressStatus, number>;
};

type ApiErrorPayload = {
  error?: {
    message?: string;
  };
};

const progressOptions: StudyProgressStatus[] = ["planned", "in_progress", "review_needed", "completed"];

function toApiErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  return (payload as ApiErrorPayload).error?.message ?? fallback;
}

export function StudyReviewPanel() {
  const searchParams = useSearchParams();
  const requestedStudentId = searchParams.get("studentId") ?? "";
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [hasInitializedStudentSelection, setHasInitializedStudentSelection] = useState(false);
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueResponse["reviewQueue"]>([]);
  const [progressSummary, setProgressSummary] = useState<Record<StudyProgressStatus, number>>({
    planned: 0,
    in_progress: 0,
    review_needed: 0,
    completed: 0,
  });
  const [feedbackDraft, setFeedbackDraft] = useState<Record<string, string>>({});
  const [progressDraft, setProgressDraft] = useState<Record<string, StudyProgressStatus>>({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [message, setMessage] = useState("");

  function applyReviewData(queue: ReviewQueueResponse["reviewQueue"], summary: ProgressResponse["summary"]) {
    setReviewQueue(queue);
    setProgressSummary(summary);
    setFeedbackDraft(
      queue.reduce<Record<string, string>>((draft, item) => {
        draft[item.id] = item.review?.feedback ?? "";
        return draft;
      }, {}),
    );
    setProgressDraft(
      queue.reduce<Record<string, StudyProgressStatus>>((draft, item) => {
        draft[item.id] = item.review?.progressStatus ?? (item.result.wrongItems > 0 ? "review_needed" : "completed");
        return draft;
      }, {}),
    );
  }

  async function fetchReviewData(studentId: string) {
    const [reviewsResponse, progressResponse] = await Promise.all([
      fetch(`/api/v1/study/reviews?studentId=${studentId}`),
      fetch(`/api/v1/study/progress?studentId=${studentId}`),
    ]);
    const [reviewsPayload, progressPayload] = await Promise.all([
      reviewsResponse.json().catch(() => null),
      progressResponse.json().catch(() => null),
    ]);

    if (!reviewsResponse.ok) {
      throw new Error(toApiErrorMessage(reviewsPayload, "리뷰 큐를 불러오지 못했습니다."));
    }

    if (!progressResponse.ok) {
      throw new Error(toApiErrorMessage(progressPayload, "진도 요약을 불러오지 못했습니다."));
    }

    return {
      queue: (reviewsPayload as ReviewQueueResponse).reviewQueue ?? [],
      summary: (progressPayload as ProgressResponse).summary,
    };
  }

  useEffect(() => {
    fetch("/api/v1/students")
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as { students?: Student[] } | ApiErrorPayload | null;

        if (!response.ok) {
          throw new Error(toApiErrorMessage(payload, "학생 목록을 불러오지 못했습니다."));
        }

        const items = (payload as { students?: Student[] }).students ?? [];
        setStudents(items);
      })
      .catch((error: unknown) => {
        setErrorMessage(error instanceof Error ? error.message : "학생 목록을 불러오지 못했습니다.");
      });
  }, []);

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

    let cancelled = false;

    async function loadReviewData() {
      setLoading(true);
      setErrorMessage("");

      try {
        const result = await fetchReviewData(selectedStudentId);

        if (!cancelled) {
          applyReviewData(result.queue, result.summary);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "리뷰 큐를 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadReviewData().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [selectedStudentId]);

  async function handleSubmitReview(sessionId: string) {
    setErrorMessage("");
    setMessage("");

    const response = await fetch(`/api/v1/study/reviews/${sessionId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        feedback: feedbackDraft[sessionId] ?? "",
        progressStatus: progressDraft[sessionId],
      }),
    });
    const payload = (await response.json().catch(() => null)) as { review?: { id: string } } | ApiErrorPayload | null;

    if (!response.ok) {
      setErrorMessage(toApiErrorMessage(payload, "리뷰 저장에 실패했습니다."));
      return;
    }

    setMessage("학습 리뷰를 저장했습니다.");
    const result = await fetchReviewData(selectedStudentId);
    applyReviewData(result.queue, result.summary);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-xs tracking-[0.26em] text-teal-700 uppercase">Review Queue</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">학생이 제출한 학습 세션을 검토합니다</h2>
          </div>
          <label className="space-y-1 text-sm text-slate-700">
            <span>학생 선택</span>
            <select
              value={selectedStudentId}
              onChange={(event) => setSelectedStudentId(event.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2"
            >
              <option value="">학생 선택</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {progressOptions.map((status) => (
            <div key={status} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-500">{getProgressStatusLabel(status)}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{progressSummary[status] ?? 0}</p>
            </div>
          ))}
        </div>
      </section>

      {loading ? <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">리뷰 큐를 불러오는 중입니다.</p> : null}
      {errorMessage ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p> : null}
      {message ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}

      <div className="grid gap-4">
        {reviewQueue.map((item) => (
          <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">{item.practiceSet?.title ?? "학습 세션"}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {item.practiceSet?.unitName ?? "단원 미확인"} · {item.result.correctItems}/{item.result.totalProblems} 정답
                </p>
              </div>
              <ProgressStatusPill status={progressDraft[item.id] ?? (item.result.wrongItems > 0 ? "review_needed" : "completed")} />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">제출 정보</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    제출일 {item.submittedAt?.slice(0, 10) ?? "-"} · 풀이 시간 {item.elapsedSeconds ?? 0}초 · 오답 {item.result.wrongItems}개
                  </p>
                </div>
                {item.workArtifact?.imagePath ? (
                  <Image
                    src={item.workArtifact.imagePath}
                    alt="학생 풀이 캔버스"
                    width={1200}
                    height={900}
                    className="h-auto w-full rounded-2xl border border-slate-200 bg-slate-50 object-cover"
                  />
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                    제출된 풀이 이미지가 없습니다.
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label className="space-y-1 text-sm text-slate-700">
                  <span>피드백</span>
                  <textarea
                    value={feedbackDraft[item.id] ?? ""}
                    onChange={(event) =>
                      setFeedbackDraft((prev) => ({
                        ...prev,
                        [item.id]: event.target.value,
                      }))
                    }
                    rows={5}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </label>

                <label className="space-y-1 text-sm text-slate-700">
                  <span>리뷰 후 단원 상태</span>
                  <select
                    value={progressDraft[item.id] ?? (item.result.wrongItems > 0 ? "review_needed" : "completed")}
                    onChange={(event) =>
                      setProgressDraft((prev) => ({
                        ...prev,
                        [item.id]: event.target.value as StudyProgressStatus,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  >
                    {progressOptions.map((status) => (
                      <option key={`${item.id}-${status}`} value={status}>
                        {getProgressStatusLabel(status)}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    handleSubmitReview(item.id).catch(() => undefined);
                  }}
                  className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
                >
                  리뷰 저장
                </button>

                {item.review ? (
                  <p className="text-sm leading-6 text-slate-500">
                    최근 리뷰 {item.review.reviewedAt.slice(0, 10)} · {getProgressStatusLabel(item.review.progressStatus)}
                  </p>
                ) : (
                  <p className="text-sm text-amber-700">아직 보호자 리뷰가 남아 있습니다.</p>
                )}
              </div>
            </div>
          </article>
        ))}

        {!loading && selectedStudentId && reviewQueue.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">
            현재 검토할 학습 세션이 없습니다.
          </p>
        ) : null}
      </div>
    </div>
  );
}
