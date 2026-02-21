"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Student = {
  id: string;
  name: string;
};

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

function today() {
  return new Date().toISOString().slice(0, 10);
}

function toApiErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  return (payload as ApiErrorPayload).error?.message ?? fallback;
}

export function WrongAnswerManager() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState(today());
  const [categoryKey, setCategoryKey] = useState("");
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswerItem[]>([]);
  const [categoryDraft, setCategoryDraft] = useState<Record<string, string>>({});
  const [uploadFiles, setUploadFiles] = useState<Record<string, File | null>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const selectedStudentName = useMemo(
    () => students.find((student) => student.id === selectedStudentId)?.name ?? "",
    [students, selectedStudentId],
  );

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

  const loadWrongAnswers = useCallback(async () => {
    if (!selectedStudentId) {
      setErrorMessage("학생을 선택해주세요.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setMessage("");

    try {
      const query = new URLSearchParams({
        studentId: selectedStudentId,
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        ...(categoryKey ? { categoryKey } : {}),
      });

      const response = await fetch(`/api/v1/wrong-answers?${query.toString()}`);
      const payload = (await response.json().catch(() => null)) as
        | { wrongAnswers?: WrongAnswerItem[] }
        | ApiErrorPayload
        | null;

      if (!response.ok) {
        throw new Error(toApiErrorMessage(payload, "오답 목록을 불러오지 못했습니다."));
      }

      const items = (payload as { wrongAnswers?: WrongAnswerItem[] })?.wrongAnswers ?? [];
      setWrongAnswers(items);
      setCategoryDraft(
        Object.fromEntries(items.map((item) => [item.id, item.categories.map((entry) => entry.key).join(", ")])),
      );
      setMessage(`오답 ${items.length}건을 불러왔습니다.`);
    } finally {
      setLoading(false);
    }
  }, [categoryKey, from, selectedStudentId, to]);

  useEffect(() => {
    loadStudents().catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : "학생 목록을 불러오지 못했습니다.");
    });
  }, [loadStudents]);

  async function handleSaveCategories(wrongAnswerId: string) {
    setErrorMessage("");
    setMessage("");

    const keys = (categoryDraft[wrongAnswerId] ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const response = await fetch(`/api/v1/wrong-answers/${wrongAnswerId}/categories`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        categoryKeys: keys,
      }),
    });

    const payload = (await response.json().catch(() => null)) as WrongAnswerItem | ApiErrorPayload | null;

    if (!response.ok) {
      setErrorMessage(toApiErrorMessage(payload, "카테고리 저장에 실패했습니다."));
      return;
    }

    setWrongAnswers((prev) => prev.map((item) => (item.id === wrongAnswerId ? (payload as WrongAnswerItem) : item)));
    setMessage("카테고리가 저장되었습니다.");
  }

  async function handleUploadImage(wrongAnswerId: string) {
    setErrorMessage("");
    setMessage("");

    const file = uploadFiles[wrongAnswerId];

    if (!file) {
      setErrorMessage("업로드할 파일을 선택해주세요.");
      return;
    }

    const formData = new FormData();
    formData.set("file", file);

    const response = await fetch(`/api/v1/wrong-answers/${wrongAnswerId}/image`, {
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
    setMessage("이미지가 업로드되었습니다.");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">조회 필터</h2>
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
            <span>from</span>
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>to</span>
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>categoryKey</span>
            <input
              value={categoryKey}
              onChange={(event) => setCategoryKey(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="calculation_mistake"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => {
            loadWrongAnswers().catch((error: unknown) => {
              setErrorMessage(error instanceof Error ? error.message : "오답 목록을 불러오지 못했습니다.");
            });
          }}
          className="mt-3 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
        >
          {loading ? "조회 중..." : "오답 목록 조회"}
        </button>
        {selectedStudentName ? <p className="mt-2 text-xs text-slate-500">선택 학생: {selectedStudentName}</p> : null}
      </section>

      {errorMessage ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p> : null}
      {message ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}

      <section className="space-y-3">
        {wrongAnswers.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600 shadow-sm">
            조회된 오답이 없습니다.
          </p>
        ) : null}

        {wrongAnswers.map((wrongAnswer) => (
          <article key={wrongAnswer.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs text-slate-500">ID: {wrongAnswer.id}</p>
                <h3 className="text-sm font-semibold text-slate-900">문항 #{wrongAnswer.attemptItem.problemNo}</h3>
                <p className="text-sm text-slate-600">메모: {wrongAnswer.memo || "(없음)"}</p>
                <p className="text-xs text-slate-500">시도일: {new Date(wrongAnswer.attemptItem.attemptDate).toLocaleDateString()}</p>
              </div>
              {wrongAnswer.imagePath ? (
                <a href={wrongAnswer.imagePath} target="_blank" className="text-sm font-semibold text-sky-700 hover:text-sky-800">
                  업로드된 이미지 보기
                </a>
              ) : (
                <span className="text-xs text-slate-500">이미지 없음</span>
              )}
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm text-slate-700">
                <span>카테고리 키(콤마 구분)</span>
                <input
                  value={categoryDraft[wrongAnswer.id] ?? ""}
                  onChange={(event) =>
                    setCategoryDraft((prev) => ({
                      ...prev,
                      [wrongAnswer.id]: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="space-y-1 text-sm text-slate-700">
                <span>이미지 업로드</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) =>
                    setUploadFiles((prev) => ({
                      ...prev,
                      [wrongAnswer.id]: event.target.files?.[0] ?? null,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  handleSaveCategories(wrongAnswer.id).catch((error: unknown) => {
                    setErrorMessage(error instanceof Error ? error.message : "카테고리 저장에 실패했습니다.");
                  });
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
              >
                카테고리 저장
              </button>
              <button
                type="button"
                onClick={() => {
                  handleUploadImage(wrongAnswer.id).catch((error: unknown) => {
                    setErrorMessage(error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.");
                  });
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
              >
                이미지 업로드
              </button>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              현재 카테고리: {wrongAnswer.categories.map((entry) => entry.key).join(", ") || "(없음)"}
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
