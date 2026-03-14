"use client";

import { useEffect, useState } from "react";
import {
  buildWrongAnswerCategoryDraft,
  toCategoryKeysForSave,
  toggleCategorySelection,
  WRONG_ANSWER_CATEGORY_OPTIONS,
} from "@/modules/mistake-note/category-selection";

type WrongAnswerItem = {
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

export function StudentWrongAnswerManager() {
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswerItem[]>([]);
  const [categoryDraft, setCategoryDraft] = useState<Record<string, string[]>>({});
  const [memoDraft, setMemoDraft] = useState<Record<string, string>>({});
  const [uploadFiles, setUploadFiles] = useState<Record<string, File | null>>({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [message, setMessage] = useState("");

  async function loadWrongAnswers() {
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/v1/student/wrong-answers");
      const payload = (await response.json().catch(() => null)) as { wrongAnswers?: WrongAnswerItem[] } | ApiErrorPayload | null;

      if (!response.ok) {
        throw new Error(toApiErrorMessage(payload, "학생 오답노트를 불러오지 못했습니다."));
      }

      const items = (payload as { wrongAnswers?: WrongAnswerItem[] })?.wrongAnswers ?? [];
      setWrongAnswers(items);
      setCategoryDraft(buildWrongAnswerCategoryDraft(items));
      setMemoDraft(
        items.reduce<Record<string, string>>((draft, item) => {
          draft[item.id] = item.memo ?? "";
          return draft;
        }, {}),
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "학생 오답노트를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWrongAnswers().catch(() => undefined);
  }, []);

  async function handleSave(wrongAnswerId: string) {
    setErrorMessage("");
    setMessage("");

    const response = await fetch(`/api/v1/student/wrong-answers/${wrongAnswerId}`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        memo: memoDraft[wrongAnswerId] ?? "",
        categoryKeys: toCategoryKeysForSave(categoryDraft[wrongAnswerId] ?? []),
      }),
    });
    const payload = (await response.json().catch(() => null)) as WrongAnswerItem | ApiErrorPayload | null;

    if (!response.ok) {
      setErrorMessage(toApiErrorMessage(payload, "학생 오답노트 저장에 실패했습니다."));
      return;
    }

    const updated = payload as WrongAnswerItem;

    setWrongAnswers((prev) => prev.map((item) => (item.id === wrongAnswerId ? updated : item)));
    setCategoryDraft((prev) => ({
      ...prev,
      [wrongAnswerId]: updated.categories.map((category) => category.key),
    }));
    setMemoDraft((prev) => ({
      ...prev,
      [wrongAnswerId]: updated.memo ?? "",
    }));
    setMessage("학생 오답노트를 저장했습니다.");
  }

  async function handleUploadImage(wrongAnswerId: string) {
    setErrorMessage("");
    setMessage("");

    const file = uploadFiles[wrongAnswerId];

    if (!file) {
      setErrorMessage("업로드할 이미지를 선택해주세요.");
      return;
    }

    const formData = new FormData();
    formData.set("file", file);

    const response = await fetch(`/api/v1/student/wrong-answers/${wrongAnswerId}/image`, {
      method: "POST",
      body: formData,
    });
    const payload = (await response.json().catch(() => null)) as { imagePath?: string } | ApiErrorPayload | null;

    if (!response.ok) {
      setErrorMessage(toApiErrorMessage(payload, "이미지 업로드에 실패했습니다."));
      return;
    }

    const imagePath = (payload as { imagePath?: string })?.imagePath ?? null;
    setWrongAnswers((prev) => prev.map((item) => (item.id === wrongAnswerId ? { ...item, imagePath } : item)));
    setMessage("오답 이미지가 업로드되었습니다.");
  }

  if (loading) {
    return <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">학생 오답노트를 불러오는 중입니다.</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
        <p className="font-mono text-xs tracking-[0.26em] text-teal-700 uppercase">Review Notes</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-950">직접 오답 원인을 적고 다시 정리합니다</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          학생이 직접 메모와 카테고리를 정리하면 보호자가 피드백할 때 훨씬 빠르게 핵심을 볼 수 있습니다.
        </p>
      </section>

      {errorMessage ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p> : null}
      {message ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}

      {!wrongAnswers.length ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">
          아직 학생 오답노트가 없습니다. 학습 세션을 제출하면 여기에서 정리할 수 있습니다.
        </p>
      ) : null}

      <div className="grid gap-4">
        {wrongAnswers.map((wrongAnswer) => (
          <article key={wrongAnswer.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">문항 {wrongAnswer.attemptItem.problemNo}</h3>
                <p className="mt-1 text-xs text-slate-500">{wrongAnswer.attemptItem.attemptDate.slice(0, 10)}</p>
              </div>
              {wrongAnswer.imagePath ? (
                <a
                  href={wrongAnswer.imagePath}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-sky-700 hover:text-sky-800"
                >
                  업로드된 이미지 보기
                </a>
              ) : null}
            </div>

            <label className="mt-4 block space-y-1 text-sm text-slate-700">
              <span>내 생각 메모</span>
              <textarea
                value={memoDraft[wrongAnswer.id] ?? ""}
                onChange={(event) =>
                  setMemoDraft((prev) => ({
                    ...prev,
                    [wrongAnswer.id]: event.target.value,
                  }))
                }
                rows={3}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>

            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-slate-700">오답 카테고리</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {WRONG_ANSWER_CATEGORY_OPTIONS.map((option) => {
                  const checked = (categoryDraft[wrongAnswer.id] ?? []).includes(option.key);

                  return (
                    <label
                      key={`${wrongAnswer.id}-${option.key}`}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          setCategoryDraft((prev) => ({
                            ...prev,
                            [wrongAnswer.id]: toggleCategorySelection(
                              prev[wrongAnswer.id] ?? [],
                              option.key,
                              event.target.checked,
                            ),
                          }))
                        }
                      />
                      <span>
                        {option.labelKo} ({option.key})
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) =>
                  setUploadFiles((prev) => ({
                    ...prev,
                    [wrongAnswer.id]: event.target.files?.[0] ?? null,
                  }))
                }
                className="text-sm text-slate-600"
              />
              <button
                type="button"
                onClick={() => {
                  handleUploadImage(wrongAnswer.id).catch(() => undefined);
                }}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
              >
                이미지 업로드
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSave(wrongAnswer.id).catch(() => undefined);
                }}
                className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
              >
                저장
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
