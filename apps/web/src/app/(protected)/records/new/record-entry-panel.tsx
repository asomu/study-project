"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Student = {
  id: string;
  name: string;
  schoolLevel: "elementary" | "middle" | "high";
  grade: number;
};

type CurriculumNode = {
  id: string;
  unitName: string;
  unitCode: string;
};

type ApiErrorPayload = {
  error?: {
    message?: string;
  };
};

function toTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function readApiErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  return (payload as ApiErrorPayload).error?.message ?? fallback;
}

export function RecordEntryPanel() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [curriculumNodes, setCurriculumNodes] = useState<CurriculumNode[]>([]);
  const [curriculumLoading, setCurriculumLoading] = useState(false);
  const [materialId, setMaterialId] = useState("");
  const [attemptId, setAttemptId] = useState("");
  const [lastWrongAnswerId, setLastWrongAnswerId] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [materialForm, setMaterialForm] = useState({
    title: "",
    publisher: "",
    grade: 1,
    semester: 1,
  });

  const [attemptForm, setAttemptForm] = useState({
    attemptDate: toTodayDateString(),
    notes: "",
  });

  const [itemForm, setItemForm] = useState({
    curriculumNodeId: "",
    problemNo: 1,
    isCorrect: false,
    difficulty: "",
    wrongMemo: "",
  });

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedStudentId) ?? null,
    [students, selectedStudentId],
  );

  const loadStudents = useCallback(async () => {
    const response = await fetch("/api/v1/students");
    const payload = (await response.json().catch(() => null)) as { students?: Student[] } | null;

    if (!response.ok) {
      throw new Error(readApiErrorMessage(payload, "학생 목록을 불러오지 못했습니다."));
    }

    const loadedStudents = payload?.students ?? [];
    setStudents(loadedStudents);

    if (!selectedStudentId && loadedStudents[0]) {
      setSelectedStudentId(loadedStudents[0].id);
      setMaterialForm((prev) => ({
        ...prev,
        grade: loadedStudents[0].grade,
      }));
    }
  }, [selectedStudentId]);

  const loadCurriculum = useCallback(async () => {
    if (!selectedStudent) {
      setCurriculumNodes([]);
      return;
    }

    setCurriculumLoading(true);

    try {
      const query = new URLSearchParams({
        schoolLevel: selectedStudent.schoolLevel,
        grade: String(materialForm.grade),
        semester: String(materialForm.semester),
        asOfDate: toTodayDateString(),
      });

      const response = await fetch(`/api/v1/curriculum?${query.toString()}`);
      const payload = (await response.json().catch(() => null)) as { nodes?: CurriculumNode[] } | ApiErrorPayload | null;

      if (!response.ok) {
        throw new Error(readApiErrorMessage(payload, "커리큘럼을 불러오지 못했습니다."));
      }

      const nodes = (payload as { nodes?: CurriculumNode[] })?.nodes ?? [];
      setCurriculumNodes(nodes);

      setItemForm((prev) => (prev.curriculumNodeId || !nodes[0] ? prev : { ...prev, curriculumNodeId: nodes[0].id }));
    } finally {
      setCurriculumLoading(false);
    }
  }, [materialForm.grade, materialForm.semester, selectedStudent]);

  useEffect(() => {
    loadStudents().catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : "학생 목록을 불러오지 못했습니다.");
    });
  }, [loadStudents]);

  useEffect(() => {
    loadCurriculum().catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : "커리큘럼을 불러오지 못했습니다.");
    });
  }, [loadCurriculum]);

  async function handleCreateMaterial(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setMessage("");

    if (!selectedStudentId) {
      setErrorMessage("학생을 먼저 선택해주세요.");
      return;
    }

    const response = await fetch("/api/v1/materials", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        studentId: selectedStudentId,
        title: materialForm.title,
        publisher: materialForm.publisher,
        subject: "math",
        grade: materialForm.grade,
        semester: materialForm.semester,
      }),
    });

    const payload = (await response.json().catch(() => null)) as ApiErrorPayload | { id?: string } | null;

    if (!response.ok) {
      setErrorMessage(readApiErrorMessage(payload, "문제집 저장에 실패했습니다."));
      return;
    }

    setMaterialId((payload as { id?: string })?.id ?? "");
    setMessage("문제집이 저장되었습니다. 다음으로 시도를 저장하세요.");
  }

  async function handleCreateAttempt(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setMessage("");

    if (!selectedStudentId || !materialId) {
      setErrorMessage("학생/문제집 저장이 먼저 필요합니다.");
      return;
    }

    const response = await fetch("/api/v1/attempts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        studentId: selectedStudentId,
        materialId,
        attemptDate: attemptForm.attemptDate,
        notes: attemptForm.notes,
      }),
    });

    const payload = (await response.json().catch(() => null)) as ApiErrorPayload | { id?: string } | null;

    if (!response.ok) {
      setErrorMessage(readApiErrorMessage(payload, "시도 저장에 실패했습니다."));
      return;
    }

    setAttemptId((payload as { id?: string })?.id ?? "");
    setMessage("시도가 저장되었습니다. 문항 입력을 진행하세요.");
  }

  async function handleCreateAttemptItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setMessage("");

    if (!attemptId) {
      setErrorMessage("시도 저장이 먼저 필요합니다.");
      return;
    }

    const difficulty = itemForm.difficulty ? Number(itemForm.difficulty) : null;

    const itemResponse = await fetch(`/api/v1/attempts/${attemptId}/items`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            curriculumNodeId: itemForm.curriculumNodeId,
            problemNo: itemForm.problemNo,
            isCorrect: itemForm.isCorrect,
            difficulty,
          },
        ],
      }),
    });

    const itemPayload = (await itemResponse.json().catch(() => null)) as
      | ApiErrorPayload
      | { items?: Array<{ id: string }> }
      | null;

    if (!itemResponse.ok) {
      setErrorMessage(readApiErrorMessage(itemPayload, "문항 저장에 실패했습니다."));
      return;
    }

    const attemptItemId = (itemPayload as { items?: Array<{ id: string }> })?.items?.[0]?.id;

    if (!attemptItemId) {
      setErrorMessage("문항 저장 결과를 확인할 수 없습니다.");
      return;
    }

    if (!itemForm.isCorrect) {
      const wrongAnswerResponse = await fetch("/api/v1/wrong-answers", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          attemptItemId,
          memo: itemForm.wrongMemo,
        }),
      });

      const wrongAnswerPayload = (await wrongAnswerResponse.json().catch(() => null)) as
        | ApiErrorPayload
        | { id?: string }
        | null;

      if (!wrongAnswerResponse.ok) {
        setErrorMessage(readApiErrorMessage(wrongAnswerPayload, "오답 생성에 실패했습니다."));
        return;
      }

      const wrongAnswerId = (wrongAnswerPayload as { id?: string })?.id ?? "";
      setLastWrongAnswerId(wrongAnswerId);
      setMessage("문항과 오답이 저장되었습니다. 오답 관리 화면에서 카테고리/이미지를 입력하세요.");
      return;
    }

    setMessage("정답 문항이 저장되었습니다.");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">입력 순서</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600">
          <li>학생을 선택하고 문제집을 저장합니다.</li>
          <li>시도(날짜/메모)를 저장합니다.</li>
          <li>문항 결과를 저장하고 오답이면 자동으로 wrong-answer를 생성합니다.</li>
        </ol>
        {lastWrongAnswerId ? (
          <p className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-700">
            생성된 오답 ID: <span className="font-mono">{lastWrongAnswerId}</span>
          </p>
        ) : null}
        <div className="mt-3">
          <Link href="/wrong-answers/manage" className="text-sm font-semibold text-sky-700 hover:text-sky-800">
            오답 관리 화면으로 이동
          </Link>
        </div>
      </section>

      {errorMessage ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p> : null}
      {message ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}

      <form onSubmit={handleCreateMaterial} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">1. 문제집 저장</h3>
        <div className="grid gap-3 sm:grid-cols-2">
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
                  {student.name} ({student.schoolLevel}-{student.grade}학년)
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>문제집 제목</span>
            <input
              value={materialForm.title}
              onChange={(event) => setMaterialForm((prev) => ({ ...prev, title: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>출판사</span>
            <input
              value={materialForm.publisher}
              onChange={(event) => setMaterialForm((prev) => ({ ...prev, publisher: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>학년</span>
            <input
              type="number"
              min={1}
              max={12}
              value={materialForm.grade}
              onChange={(event) => setMaterialForm((prev) => ({ ...prev, grade: Number(event.target.value) }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>학기</span>
            <select
              value={materialForm.semester}
              onChange={(event) => setMaterialForm((prev) => ({ ...prev, semester: Number(event.target.value) }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value={1}>1학기</option>
              <option value={2}>2학기</option>
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                loadCurriculum().catch((error: unknown) => {
                  setErrorMessage(error instanceof Error ? error.message : "커리큘럼을 불러오지 못했습니다.");
                });
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
            >
              {curriculumLoading ? "불러오는 중..." : "커리큘럼 다시 불러오기"}
            </button>
          </div>
        </div>
        <button type="submit" className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">
          문제집 저장
        </button>
        {materialId ? <p className="text-xs text-slate-500">materialId: {materialId}</p> : null}
      </form>

      <form onSubmit={handleCreateAttempt} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">2. 시도 저장</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm text-slate-700">
            <span>시도일</span>
            <input
              type="date"
              value={attemptForm.attemptDate}
              onChange={(event) => setAttemptForm((prev) => ({ ...prev, attemptDate: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />
          </label>
          <label className="space-y-1 text-sm text-slate-700 sm:col-span-2">
            <span>메모</span>
            <textarea
              value={attemptForm.notes}
              onChange={(event) => setAttemptForm((prev) => ({ ...prev, notes: event.target.value }))}
              className="min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
        </div>
        <button type="submit" className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">
          시도 저장
        </button>
        {attemptId ? <p className="text-xs text-slate-500">attemptId: {attemptId}</p> : null}
      </form>

      <form onSubmit={handleCreateAttemptItem} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">3. 문항/오답 저장</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm text-slate-700 sm:col-span-2">
            <span>단원</span>
            <select
              value={itemForm.curriculumNodeId}
              onChange={(event) => setItemForm((prev) => ({ ...prev, curriculumNodeId: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            >
              <option value="">단원 선택</option>
              {curriculumNodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.unitName} ({node.unitCode})
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>문항 번호</span>
            <input
              type="number"
              min={1}
              value={itemForm.problemNo}
              onChange={(event) => setItemForm((prev) => ({ ...prev, problemNo: Number(event.target.value) }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>난이도(선택)</span>
            <input
              type="number"
              min={1}
              max={5}
              value={itemForm.difficulty}
              onChange={(event) => setItemForm((prev) => ({ ...prev, difficulty: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={itemForm.isCorrect}
              onChange={(event) => setItemForm((prev) => ({ ...prev, isCorrect: event.target.checked }))}
              className="h-4 w-4"
            />
            정답 여부
          </label>
          <label className="space-y-1 text-sm text-slate-700 sm:col-span-2">
            <span>오답 메모 (오답일 때만 저장)</span>
            <textarea
              value={itemForm.wrongMemo}
              onChange={(event) => setItemForm((prev) => ({ ...prev, wrongMemo: event.target.value }))}
              className="min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
        </div>
        <button type="submit" className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">
          문항 저장
        </button>
      </form>
    </div>
  );
}
