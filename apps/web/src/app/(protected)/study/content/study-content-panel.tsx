"use client";

import { PracticeProblemType, SchoolLevel } from "@prisma/client";
import { useCallback, useEffect, useState } from "react";

type ContentResponse = {
  curriculumVersion: string | null;
  curriculumNodes: Array<{
    id: string;
    curriculumVersion: string;
    unitCode: string;
    unitName: string;
    sortOrder: number;
  }>;
  practiceSets: Array<{
    id: string;
    title: string;
    description: string | null;
    schoolLevel: SchoolLevel;
    grade: number;
    semester: number;
    curriculumNodeId: string;
    unitName: string;
    sortOrder: number;
    isActive: boolean;
    isUsed: boolean;
    attemptCount: number;
    problemCount: number;
    problems: Array<{
      id: string;
      problemNo: number;
      type: PracticeProblemType;
      prompt: string;
      choices: string[] | null;
      correctAnswer: string;
      explanation: string | null;
      difficulty: number;
      skillTags: string[];
    }>;
    updatedAt: string;
  }>;
  conceptLessons: Array<{
    id: string;
    curriculumNodeId: string;
    unitName: string;
    title: string;
    summary: string | null;
    content: {
      blocks?: ConceptBlock[];
    };
    updatedAt: string;
  }>;
};

type ConceptBlock =
  | { type: "headline"; text: string }
  | { type: "visual_hint"; text: string }
  | { type: "steps"; items: string[] }
  | { type: "table"; rows: string[][] };

type ApiErrorPayload = {
  error?: {
    message?: string;
  };
};

type PracticeProblemForm = {
  problemNo: number;
  type: PracticeProblemType;
  prompt: string;
  choicesText: string;
  correctAnswer: string;
  explanation: string;
  skillTagsText: string;
  difficulty: number;
};

type PracticeSetForm = {
  title: string;
  description: string;
  schoolLevel: SchoolLevel;
  grade: number;
  semester: number;
  curriculumNodeId: string;
  sortOrder: number;
  isActive: boolean;
  problems: PracticeProblemForm[];
};

type ConceptBlockForm =
  | { type: "headline"; text: string }
  | { type: "visual_hint"; text: string }
  | { type: "steps"; items: string[] }
  | { type: "table"; rows: Array<[string, string]> };

type ConceptForm = {
  title: string;
  summary: string;
  blocks: ConceptBlockForm[];
};

const schoolLevelOptions: Array<{ value: SchoolLevel; label: string }> = [
  { value: "elementary", label: "초등" },
  { value: "middle", label: "중등" },
  { value: "high", label: "고등" },
];

const blockTypeOptions: Array<{ value: ConceptBlockForm["type"]; label: string }> = [
  { value: "headline", label: "핵심 문장" },
  { value: "visual_hint", label: "비주얼 힌트" },
  { value: "steps", label: "단계 설명" },
  { value: "table", label: "표" },
];

function toApiErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  return (payload as ApiErrorPayload).error?.message ?? fallback;
}

function createEmptyProblem(problemNo = 1): PracticeProblemForm {
  return {
    problemNo,
    type: PracticeProblemType.short_answer,
    prompt: "",
    choicesText: "",
    correctAnswer: "",
    explanation: "",
    skillTagsText: "",
    difficulty: 3,
  };
}

function createEmptyPracticeSetForm(filters: { schoolLevel: SchoolLevel; grade: number; semester: number }, curriculumNodeId = ""): PracticeSetForm {
  return {
    title: "",
    description: "",
    schoolLevel: filters.schoolLevel,
    grade: filters.grade,
    semester: filters.semester,
    curriculumNodeId,
    sortOrder: 0,
    isActive: true,
    problems: [createEmptyProblem()],
  };
}

function createBlockForm(type: ConceptBlockForm["type"]): ConceptBlockForm {
  if (type === "headline" || type === "visual_hint") {
    return {
      type,
      text: "",
    };
  }

  if (type === "steps") {
    return {
      type,
      items: [""],
    };
  }

  return {
    type,
    rows: [["", ""]],
  };
}

function createEmptyConceptForm(): ConceptForm {
  return {
    title: "",
    summary: "",
    blocks: [createBlockForm("headline")],
  };
}

function toPracticeSetForm(practiceSet: ContentResponse["practiceSets"][number]): PracticeSetForm {
  return {
    title: practiceSet.title,
    description: practiceSet.description ?? "",
    schoolLevel: practiceSet.schoolLevel,
    grade: practiceSet.grade,
    semester: practiceSet.semester,
    curriculumNodeId: practiceSet.curriculumNodeId,
    sortOrder: practiceSet.sortOrder,
    isActive: practiceSet.isActive,
    problems: practiceSet.problems.map((problem) => ({
      problemNo: problem.problemNo,
      type: problem.type,
      prompt: problem.prompt,
      choicesText: problem.choices?.join("\n") ?? "",
      correctAnswer: problem.correctAnswer,
      explanation: problem.explanation ?? "",
      skillTagsText: problem.skillTags.join(", "),
      difficulty: problem.difficulty,
    })),
  };
}

function toConceptForm(lesson: ContentResponse["conceptLessons"][number] | null): ConceptForm {
  if (!lesson) {
    return createEmptyConceptForm();
  }

  return {
    title: lesson.title,
    summary: lesson.summary ?? "",
    blocks:
      lesson.content.blocks?.map((block) => {
        if (block.type === "headline" || block.type === "visual_hint") {
          return {
            type: block.type,
            text: block.text,
          };
        }

        if (block.type === "steps") {
          return {
            type: block.type,
            items: [...block.items],
          };
        }

        return {
          type: "table",
          rows: block.rows.map((row) => [row[0] ?? "", row[1] ?? ""] as [string, string]),
        };
      }) ?? [createBlockForm("headline")],
  };
}

function toPracticeSetPayload(form: PracticeSetForm) {
  return {
    title: form.title,
    description: form.description.trim() || null,
    schoolLevel: form.schoolLevel,
    grade: form.grade,
    semester: form.semester,
    curriculumNodeId: form.curriculumNodeId,
    sortOrder: form.sortOrder,
    isActive: form.isActive,
    problems: form.problems.map((problem) => ({
      problemNo: problem.problemNo,
      type: problem.type,
      prompt: problem.prompt,
      choices:
        problem.type === PracticeProblemType.single_choice
          ? problem.choicesText
              .split("\n")
              .map((choice) => choice.trim())
              .filter(Boolean)
          : null,
      correctAnswer: problem.correctAnswer,
      explanation: problem.explanation.trim() || null,
      skillTags: problem.skillTagsText
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      difficulty: problem.difficulty,
    })),
  };
}

function toConceptPayload(form: ConceptForm) {
  return {
    title: form.title,
    summary: form.summary.trim() || null,
    content: {
      blocks: form.blocks.map((block) => {
        if (block.type === "headline" || block.type === "visual_hint") {
          return {
            type: block.type,
            text: block.text,
          };
        }

        if (block.type === "steps") {
          return {
            type: block.type,
            items: block.items,
          };
        }

        return {
          type: "table",
          rows: block.rows.map((row) => [row[0], row[1]]),
        };
      }),
    },
  };
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ko-KR");
}

export function StudyContentPanel() {
  const [activeTab, setActiveTab] = useState<"practice" | "concept">("practice");
  const [filters, setFilters] = useState({
    schoolLevel: "middle" as SchoolLevel,
    grade: 1,
    semester: 1,
  });
  const [content, setContent] = useState<ContentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [message, setMessage] = useState("");
  const [selectedPracticeSetId, setSelectedPracticeSetId] = useState<string | null>(null);
  const [practiceForm, setPracticeForm] = useState<PracticeSetForm>(() => createEmptyPracticeSetForm({ schoolLevel: "middle", grade: 1, semester: 1 }));
  const [selectedConceptNodeId, setSelectedConceptNodeId] = useState("");
  const [conceptForm, setConceptForm] = useState<ConceptForm>(createEmptyConceptForm);

  const selectedPracticeSet =
    content?.practiceSets.find((practiceSet) => practiceSet.id === selectedPracticeSetId) ?? null;
  const selectedConceptLesson =
    content?.conceptLessons.find((lesson) => lesson.curriculumNodeId === selectedConceptNodeId) ?? null;
  const selectedConceptNode =
    content?.curriculumNodes.find((node) => node.id === selectedConceptNodeId) ?? null;
  const practiceStructureLocked = Boolean(selectedPracticeSet?.isUsed);

  const loadContent = useCallback(async ({ practiceSetId = null, conceptNodeId = "" }: { practiceSetId?: string | null; conceptNodeId?: string } = {}) => {
    setLoading(true);
    setErrorMessage("");

    try {
      const query = new URLSearchParams({
        schoolLevel: filters.schoolLevel,
        grade: String(filters.grade),
        semester: String(filters.semester),
      });
      const response = await fetch(`/api/v1/study/content?${query.toString()}`);
      const payload = (await response.json().catch(() => null)) as ContentResponse | ApiErrorPayload | null;

      if (!response.ok) {
        throw new Error(toApiErrorMessage(payload, "학습 콘텐츠를 불러오지 못했습니다."));
      }

      const nextContent = payload as ContentResponse;
      setContent(nextContent);

      const nextPracticeSet =
        nextContent.practiceSets.find((practiceSet) => practiceSet.id === practiceSetId) ?? null;
      const fallbackNodeId = nextContent.curriculumNodes[0]?.id ?? "";
      const nextNodeId =
        nextContent.curriculumNodes.find((node) => node.id === conceptNodeId)?.id ?? fallbackNodeId;
      const nextLesson = nextContent.conceptLessons.find((lesson) => lesson.curriculumNodeId === nextNodeId) ?? null;

      setSelectedPracticeSetId(nextPracticeSet?.id ?? null);
      setPracticeForm(
        nextPracticeSet
          ? toPracticeSetForm(nextPracticeSet)
          : createEmptyPracticeSetForm(filters, nextContent.curriculumNodes[0]?.id ?? ""),
      );
      setSelectedConceptNodeId(nextNodeId);
      setConceptForm(toConceptForm(nextLesson));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "학습 콘텐츠를 불러오지 못했습니다.");
      setContent(null);
    } finally {
      setLoading(false);
    }
  }, [filters, setContent, setErrorMessage, setLoading, setPracticeForm, setSelectedConceptNodeId, setSelectedPracticeSetId]);

  useEffect(() => {
    loadContent().catch(() => undefined);
  }, [loadContent]);

  function resetPracticeForm() {
    setSelectedPracticeSetId(null);
    setPracticeForm(createEmptyPracticeSetForm(filters, content?.curriculumNodes[0]?.id ?? ""));
  }

  function selectPracticeSet(practiceSetId: string) {
    const practiceSet = content?.practiceSets.find((item) => item.id === practiceSetId);

    if (!practiceSet) {
      return;
    }

    setSelectedPracticeSetId(practiceSetId);
    setPracticeForm(toPracticeSetForm(practiceSet));
    setMessage("");
    setErrorMessage("");
  }

  function selectConceptNode(curriculumNodeId: string) {
    const lesson = content?.conceptLessons.find((item) => item.curriculumNodeId === curriculumNodeId) ?? null;

    setSelectedConceptNodeId(curriculumNodeId);
    setConceptForm(toConceptForm(lesson));
    setMessage("");
    setErrorMessage("");
  }

  async function handleSavePracticeSet() {
    setSaving(true);
    setErrorMessage("");
    setMessage("");

    try {
      const response = await fetch(
        selectedPracticeSetId
          ? `/api/v1/study/content/practice-sets/${selectedPracticeSetId}`
          : "/api/v1/study/content/practice-sets",
        {
          method: selectedPracticeSetId ? "PUT" : "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(toPracticeSetPayload(practiceForm)),
        },
      );
      const payload = (await response.json().catch(() => null)) as
        | { practiceSet?: { id: string } }
        | ApiErrorPayload
        | null;

      if (!response.ok) {
        throw new Error(toApiErrorMessage(payload, "연습 세트를 저장하지 못했습니다."));
      }

      const nextPracticeSetId = (payload as { practiceSet?: { id: string } }).practiceSet?.id ?? selectedPracticeSetId;
      await loadContent({ practiceSetId: nextPracticeSetId ?? null, conceptNodeId: selectedConceptNodeId });
      setMessage(selectedPracticeSetId ? "연습 세트를 수정했습니다." : "연습 세트를 만들었습니다.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "연습 세트를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePracticeSetActivation(practiceSetId: string, isActive: boolean) {
    setSaving(true);
    setErrorMessage("");
    setMessage("");

    try {
      const response = await fetch(`/api/v1/study/content/practice-sets/${practiceSetId}/activation`, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          isActive,
        }),
      });
      const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;

      if (!response.ok) {
        throw new Error(toApiErrorMessage(payload, "활성 상태를 변경하지 못했습니다."));
      }

      await loadContent({ practiceSetId, conceptNodeId: selectedConceptNodeId });
      setMessage(isActive ? "연습 세트를 활성화했습니다." : "연습 세트를 비활성화했습니다.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "활성 상태를 변경하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveConcept() {
    if (!selectedConceptNodeId) {
      setErrorMessage("개념 자료를 작성할 단원을 먼저 선택해주세요.");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setMessage("");

    try {
      const response = await fetch(`/api/v1/study/content/concepts/${selectedConceptNodeId}`, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(toConceptPayload(conceptForm)),
      });
      const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;

      if (!response.ok) {
        throw new Error(toApiErrorMessage(payload, "개념 자료를 저장하지 못했습니다."));
      }

      await loadContent({ practiceSetId: selectedPracticeSetId, conceptNodeId: selectedConceptNodeId });
      setMessage(selectedConceptLesson ? "개념 자료를 수정했습니다." : "개념 자료를 만들었습니다.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "개념 자료를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConcept() {
    if (!selectedConceptNodeId || !selectedConceptLesson) {
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setMessage("");

    try {
      const response = await fetch(`/api/v1/study/content/concepts/${selectedConceptNodeId}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;

      if (!response.ok) {
        throw new Error(toApiErrorMessage(payload, "개념 자료를 삭제하지 못했습니다."));
      }

      await loadContent({ practiceSetId: selectedPracticeSetId, conceptNodeId: selectedConceptNodeId });
      setConceptForm(createEmptyConceptForm());
      setMessage("개념 자료를 삭제했습니다.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "개념 자료를 삭제하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">학습 콘텐츠를 불러오는 중입니다.</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-[0.26em] text-teal-700 uppercase">Content Authoring</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">학생이 보게 될 연습 세트와 개념 자료를 운영합니다</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              최신 교육과정 버전을 기준으로 연습 세트와 개념 블록을 수정합니다. 저장 후 학생 화면에서 바로 반영됩니다.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Curriculum Version</p>
            <p className="mt-2 font-semibold text-slate-900">{content?.curriculumVersion ?? "없음"}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <label className="space-y-1 text-sm text-slate-700">
            <span>학교급</span>
            <select
              value={filters.schoolLevel}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  schoolLevel: event.target.value as SchoolLevel,
                }))
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            >
              {schoolLevelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>학년</span>
            <input
              type="number"
              min={1}
              max={12}
              value={filters.grade}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  grade: Number(event.target.value),
                }))
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>학기</span>
            <select
              value={filters.semester}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  semester: Number(event.target.value),
                }))
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            >
              <option value={1}>1학기</option>
              <option value={2}>2학기</option>
            </select>
          </label>
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            단원 {content?.curriculumNodes.length ?? 0}개 · 연습 세트 {content?.practiceSets.length ?? 0}개 · 개념 자료{" "}
            {content?.conceptLessons.length ?? 0}개
          </div>
        </div>
      </section>

      {errorMessage ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p> : null}
      {message ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}

      <section className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setActiveTab("practice")}
            className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
              activeTab === "practice" ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100"
            }`}
          >
            연습 세트
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("concept")}
            className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
              activeTab === "concept" ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100"
            }`}
          >
            개념 자료
          </button>
        </div>
      </section>

      {activeTab === "practice" ? (
        <section className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">연습 세트 목록</h3>
                <p className="mt-1 text-xs text-slate-500">단원별 세트와 사용 여부를 확인합니다.</p>
              </div>
              <button
                type="button"
                onClick={resetPracticeForm}
                className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-slate-400"
              >
                새 세트 작성
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {content?.practiceSets.length ? (
                content.practiceSets.map((practiceSet) => (
                  <button
                    key={practiceSet.id}
                    type="button"
                    onClick={() => selectPracticeSet(practiceSet.id)}
                    className={`block w-full rounded-2xl border p-4 text-left transition ${
                      selectedPracticeSetId === practiceSet.id
                        ? "border-teal-300 bg-teal-50"
                        : "border-slate-200 bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{practiceSet.title}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {practiceSet.unitName} · {practiceSet.problemCount}문항
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                          practiceSet.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {practiceSet.isActive ? "활성" : "비활성"}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium">
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-600">
                        정렬 {practiceSet.sortOrder}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-600">
                        {practiceSet.isUsed ? `사용됨 ${practiceSet.attemptCount}회` : "미사용"}
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
                  아직 작성된 연습 세트가 없습니다.
                </p>
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  {selectedPracticeSet ? "연습 세트 수정" : "연습 세트 만들기"}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  사용된 세트는 제목, 설명, 정렬, 활성 상태만 수정할 수 있습니다.
                </p>
              </div>
              {selectedPracticeSet ? (
                <button
                  type="button"
                  onClick={() => {
                    handleTogglePracticeSetActivation(selectedPracticeSet.id, !selectedPracticeSet.isActive).catch(() => undefined);
                  }}
                  className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-slate-400"
                >
                  {selectedPracticeSet.isActive ? "비활성화" : "활성화"}
                </button>
              ) : null}
            </div>

            {practiceStructureLocked ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                이 세트는 이미 학생 학습에 사용되었습니다. 문제 구조와 단원 연결은 잠기고, 메타데이터만 수정할 수 있습니다.
              </div>
            ) : null}

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm text-slate-700">
                <span>세트 제목</span>
                <input
                  type="text"
                  value={practiceForm.title}
                  onChange={(event) => setPracticeForm((current) => ({ ...current, title: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="space-y-1 text-sm text-slate-700">
                <span>정렬 순서</span>
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={practiceForm.sortOrder}
                  onChange={(event) =>
                    setPracticeForm((current) => ({
                      ...current,
                      sortOrder: Number(event.target.value),
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="space-y-1 text-sm text-slate-700 md:col-span-2">
                <span>설명</span>
                <textarea
                  value={practiceForm.description}
                  onChange={(event) => setPracticeForm((current) => ({ ...current, description: event.target.value }))}
                  rows={3}
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="space-y-1 text-sm text-slate-700">
                <span>학교급</span>
                <select
                  value={practiceForm.schoolLevel}
                  onChange={(event) =>
                    setPracticeForm((current) => ({
                      ...current,
                      schoolLevel: event.target.value as SchoolLevel,
                    }))
                  }
                  disabled={practiceStructureLocked}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                >
                  {schoolLevelOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm text-slate-700">
                <span>학년</span>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={practiceForm.grade}
                  onChange={(event) =>
                    setPracticeForm((current) => ({
                      ...current,
                      grade: Number(event.target.value),
                    }))
                  }
                  disabled={practiceStructureLocked}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                />
              </label>
              <label className="space-y-1 text-sm text-slate-700">
                <span>학기</span>
                <select
                  value={practiceForm.semester}
                  onChange={(event) =>
                    setPracticeForm((current) => ({
                      ...current,
                      semester: Number(event.target.value),
                    }))
                  }
                  disabled={practiceStructureLocked}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                >
                  <option value={1}>1학기</option>
                  <option value={2}>2학기</option>
                </select>
              </label>
              <label className="space-y-1 text-sm text-slate-700">
                <span>단원</span>
                <select
                  value={practiceForm.curriculumNodeId}
                  onChange={(event) =>
                    setPracticeForm((current) => ({
                      ...current,
                      curriculumNodeId: event.target.value,
                    }))
                  }
                  disabled={practiceStructureLocked}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                >
                  <option value="">단원 선택</option>
                  {content?.curriculumNodes.map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.unitName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={practiceForm.isActive}
                  onChange={(event) =>
                    setPracticeForm((current) => ({
                      ...current,
                      isActive: event.target.checked,
                    }))
                  }
                />
                <span>학생에게 노출</span>
              </label>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">문항 편집</h4>
                  <p className="mt-1 text-xs text-slate-500">객관식은 줄바꿈으로 선택지를 입력하고, skill tag는 쉼표로 구분합니다.</p>
                </div>
                {!practiceStructureLocked ? (
                  <button
                    type="button"
                    onClick={() =>
                      setPracticeForm((current) => ({
                        ...current,
                        problems: [...current.problems, createEmptyProblem(current.problems.length + 1)],
                      }))
                    }
                    className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-slate-400"
                  >
                    문항 추가
                  </button>
                ) : null}
              </div>

              {practiceForm.problems.map((problem, index) => (
                <div key={`problem-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">문항 {index + 1}</p>
                    {!practiceStructureLocked ? (
                      <button
                        type="button"
                        onClick={() =>
                          setPracticeForm((current) => ({
                            ...current,
                            problems: current.problems.filter((_, problemIndex) => problemIndex !== index),
                          }))
                        }
                        disabled={practiceForm.problems.length === 1}
                        className="text-xs font-semibold text-rose-700 disabled:text-slate-400"
                      >
                        삭제
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <label className="space-y-1 text-sm text-slate-700">
                      <span>문항 번호</span>
                      <input
                        type="number"
                        min={1}
                        max={999}
                        value={problem.problemNo}
                        onChange={(event) =>
                          setPracticeForm((current) => ({
                            ...current,
                            problems: current.problems.map((item, problemIndex) =>
                              problemIndex === index ? { ...item, problemNo: Number(event.target.value) } : item,
                            ),
                          }))
                        }
                        disabled={practiceStructureLocked}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                      />
                    </label>
                    <label className="space-y-1 text-sm text-slate-700">
                      <span>문항 유형</span>
                      <select
                        value={problem.type}
                        onChange={(event) =>
                          setPracticeForm((current) => ({
                            ...current,
                            problems: current.problems.map((item, problemIndex) =>
                              problemIndex === index
                                ? {
                                    ...item,
                                    type: event.target.value as PracticeProblemType,
                                    choicesText:
                                      event.target.value === PracticeProblemType.short_answer ? "" : item.choicesText,
                                  }
                                : item,
                            ),
                          }))
                        }
                        disabled={practiceStructureLocked}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                      >
                        <option value={PracticeProblemType.short_answer}>단답형</option>
                        <option value={PracticeProblemType.single_choice}>객관식</option>
                      </select>
                    </label>
                    <label className="space-y-1 text-sm text-slate-700 md:col-span-2">
                      <span>문항 본문</span>
                      <textarea
                        value={problem.prompt}
                        onChange={(event) =>
                          setPracticeForm((current) => ({
                            ...current,
                            problems: current.problems.map((item, problemIndex) =>
                              problemIndex === index ? { ...item, prompt: event.target.value } : item,
                            ),
                          }))
                        }
                        disabled={practiceStructureLocked}
                        rows={3}
                        className="w-full rounded-2xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                      />
                    </label>
                    {problem.type === PracticeProblemType.single_choice ? (
                      <label className="space-y-1 text-sm text-slate-700 md:col-span-2">
                        <span>선택지 (줄바꿈 구분)</span>
                        <textarea
                          value={problem.choicesText}
                          onChange={(event) =>
                            setPracticeForm((current) => ({
                              ...current,
                              problems: current.problems.map((item, problemIndex) =>
                                problemIndex === index ? { ...item, choicesText: event.target.value } : item,
                              ),
                            }))
                          }
                          disabled={practiceStructureLocked}
                          rows={4}
                          className="w-full rounded-2xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                        />
                      </label>
                    ) : null}
                    <label className="space-y-1 text-sm text-slate-700">
                      <span>정답</span>
                      <input
                        type="text"
                        value={problem.correctAnswer}
                        onChange={(event) =>
                          setPracticeForm((current) => ({
                            ...current,
                            problems: current.problems.map((item, problemIndex) =>
                              problemIndex === index ? { ...item, correctAnswer: event.target.value } : item,
                            ),
                          }))
                        }
                        disabled={practiceStructureLocked}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                      />
                    </label>
                    <label className="space-y-1 text-sm text-slate-700">
                      <span>난이도</span>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={problem.difficulty}
                        onChange={(event) =>
                          setPracticeForm((current) => ({
                            ...current,
                            problems: current.problems.map((item, problemIndex) =>
                              problemIndex === index ? { ...item, difficulty: Number(event.target.value) } : item,
                            ),
                          }))
                        }
                        disabled={practiceStructureLocked}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                      />
                    </label>
                    <label className="space-y-1 text-sm text-slate-700">
                      <span>Skill Tags (쉼표 구분)</span>
                      <input
                        type="text"
                        value={problem.skillTagsText}
                        onChange={(event) =>
                          setPracticeForm((current) => ({
                            ...current,
                            problems: current.problems.map((item, problemIndex) =>
                              problemIndex === index ? { ...item, skillTagsText: event.target.value } : item,
                            ),
                          }))
                        }
                        disabled={practiceStructureLocked}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                      />
                    </label>
                    <label className="space-y-1 text-sm text-slate-700">
                      <span>해설</span>
                      <input
                        type="text"
                        value={problem.explanation}
                        onChange={(event) =>
                          setPracticeForm((current) => ({
                            ...current,
                            problems: current.problems.map((item, problemIndex) =>
                              problemIndex === index ? { ...item, explanation: event.target.value } : item,
                            ),
                          }))
                        }
                        disabled={practiceStructureLocked}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  handleSavePracticeSet().catch(() => undefined);
                }}
                disabled={saving}
                className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:bg-slate-400"
              >
                {saving ? "저장 중..." : selectedPracticeSet ? "연습 세트 저장" : "연습 세트 생성"}
              </button>
              {selectedPracticeSet ? (
                <p className="text-sm text-slate-500">마지막 수정 {formatDateTime(selectedPracticeSet.updatedAt)}</p>
              ) : null}
            </div>
          </article>
        </section>
      ) : (
        <section className="grid gap-4 xl:grid-cols-[0.86fr_1.14fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">개념 자료 목록</h3>
                <p className="mt-1 text-xs text-slate-500">단원별 개념 자료 존재 여부를 관리합니다.</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {content?.curriculumNodes.length ? (
                content.curriculumNodes.map((node) => {
                  const lesson = content.conceptLessons.find((item) => item.curriculumNodeId === node.id) ?? null;

                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => selectConceptNode(node.id)}
                      className={`block w-full rounded-2xl border p-4 text-left transition ${
                        selectedConceptNodeId === node.id ? "border-teal-300 bg-teal-50" : "border-slate-200 bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{node.unitName}</p>
                          <p className="mt-1 text-xs text-slate-500">{node.unitCode}</p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                            lesson ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {lesson ? "작성됨" : "비어있음"}
                        </span>
                      </div>
                      {lesson ? <p className="mt-3 text-sm text-slate-600">{lesson.title}</p> : null}
                    </button>
                  );
                })
              ) : (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
                  선택한 조건에 해당하는 단원이 없습니다.
                </p>
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  {selectedConceptLesson ? "개념 자료 수정" : "개념 자료 만들기"}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  현재 학생 화면에서 렌더링하는 블록 타입만 허용합니다.
                </p>
              </div>
              {selectedConceptLesson ? (
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteConcept().catch(() => undefined);
                  }}
                  className="rounded-full border border-rose-300 px-3 py-1.5 text-sm font-semibold text-rose-700 hover:border-rose-400"
                >
                  삭제
                </button>
              ) : null}
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">선택 단원</p>
                <p className="mt-2 font-semibold text-slate-900">{selectedConceptNode?.unitName ?? "단원 선택 필요"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">상태</p>
                <p className="mt-2 font-semibold text-slate-900">{selectedConceptLesson ? "작성됨" : "신규 작성"}</p>
              </div>
              <label className="space-y-1 text-sm text-slate-700 md:col-span-2">
                <span>제목</span>
                <input
                  type="text"
                  value={conceptForm.title}
                  onChange={(event) => setConceptForm((current) => ({ ...current, title: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="space-y-1 text-sm text-slate-700 md:col-span-2">
                <span>요약</span>
                <textarea
                  value={conceptForm.summary}
                  onChange={(event) => setConceptForm((current) => ({ ...current, summary: event.target.value }))}
                  rows={3}
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2"
                />
              </label>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">블록 편집</h4>
                  <p className="mt-1 text-xs text-slate-500">핵심 문장, 비주얼 힌트, 단계, 표 블록만 지원합니다.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {blockTypeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setConceptForm((current) => ({
                          ...current,
                          blocks: [...current.blocks, createBlockForm(option.value)],
                        }))
                      }
                      className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-400"
                    >
                      {option.label} 추가
                    </button>
                  ))}
                </div>
              </div>

              {conceptForm.blocks.map((block, blockIndex) => (
                <div key={`block-${blockIndex}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">
                      {blockTypeOptions.find((option) => option.value === block.type)?.label}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setConceptForm((current) => ({
                          ...current,
                          blocks: current.blocks.filter((_, index) => index !== blockIndex),
                        }))
                      }
                      disabled={conceptForm.blocks.length === 1}
                      className="text-xs font-semibold text-rose-700 disabled:text-slate-400"
                    >
                      삭제
                    </button>
                  </div>

                  {block.type === "headline" || block.type === "visual_hint" ? (
                    <label className="mt-3 block space-y-1 text-sm text-slate-700">
                      <span>텍스트</span>
                      <textarea
                        value={block.text}
                        onChange={(event) =>
                          setConceptForm((current) => ({
                            ...current,
                            blocks: current.blocks.map((item, index) =>
                              index === blockIndex ? { ...item, text: event.target.value } : item,
                            ) as ConceptBlockForm[],
                          }))
                        }
                        rows={3}
                        className="w-full rounded-2xl border border-slate-300 px-3 py-2"
                      />
                    </label>
                  ) : null}

                  {block.type === "steps" ? (
                    <div className="mt-3 space-y-3">
                      {block.items.map((item, itemIndex) => (
                        <div key={`step-${itemIndex}`} className="flex gap-2">
                          <input
                            type="text"
                            value={item}
                            onChange={(event) =>
                              setConceptForm((current) => ({
                                ...current,
                                blocks: current.blocks.map((entry, index) =>
                                  index === blockIndex && entry.type === "steps"
                                    ? {
                                        ...entry,
                                        items: entry.items.map((stepItem, entryIndex) =>
                                          entryIndex === itemIndex ? event.target.value : stepItem,
                                        ),
                                      }
                                    : entry,
                                ) as ConceptBlockForm[],
                              }))
                            }
                            className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setConceptForm((current) => ({
                                ...current,
                                blocks: current.blocks.map((entry, index) =>
                                  index === blockIndex && entry.type === "steps"
                                    ? {
                                        ...entry,
                                        items: entry.items.filter((_, entryIndex) => entryIndex !== itemIndex),
                                      }
                                    : entry,
                                ) as ConceptBlockForm[],
                              }))
                            }
                            disabled={block.items.length === 1}
                            className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:text-slate-400"
                          >
                            삭제
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          setConceptForm((current) => ({
                            ...current,
                            blocks: current.blocks.map((entry, index) =>
                              index === blockIndex && entry.type === "steps"
                                ? {
                                    ...entry,
                                    items: [...entry.items, ""],
                                  }
                                : entry,
                            ) as ConceptBlockForm[],
                          }))
                        }
                        className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-400"
                      >
                        단계 추가
                      </button>
                    </div>
                  ) : null}

                  {block.type === "table" ? (
                    <div className="mt-3 space-y-3">
                      {block.rows.map((row, rowIndex) => (
                        <div key={`row-${rowIndex}`} className="grid gap-2 md:grid-cols-[0.9fr_1.1fr_auto]">
                          <input
                            type="text"
                            value={row[0]}
                            onChange={(event) =>
                              setConceptForm((current) => ({
                                ...current,
                                blocks: current.blocks.map((entry, index) =>
                                  index === blockIndex && entry.type === "table"
                                    ? {
                                        ...entry,
                                        rows: entry.rows.map((currentRow, entryIndex) =>
                                          entryIndex === rowIndex ? [event.target.value, currentRow[1]] : currentRow,
                                        ),
                                      }
                                    : entry,
                                ) as ConceptBlockForm[],
                              }))
                            }
                            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                            placeholder="왼쪽 열"
                          />
                          <input
                            type="text"
                            value={row[1]}
                            onChange={(event) =>
                              setConceptForm((current) => ({
                                ...current,
                                blocks: current.blocks.map((entry, index) =>
                                  index === blockIndex && entry.type === "table"
                                    ? {
                                        ...entry,
                                        rows: entry.rows.map((currentRow, entryIndex) =>
                                          entryIndex === rowIndex ? [currentRow[0], event.target.value] : currentRow,
                                        ),
                                      }
                                    : entry,
                                ) as ConceptBlockForm[],
                              }))
                            }
                            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                            placeholder="오른쪽 열"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setConceptForm((current) => ({
                                ...current,
                                blocks: current.blocks.map((entry, index) =>
                                  index === blockIndex && entry.type === "table"
                                    ? {
                                        ...entry,
                                        rows: entry.rows.filter((_, entryIndex) => entryIndex !== rowIndex),
                                      }
                                    : entry,
                                ) as ConceptBlockForm[],
                              }))
                            }
                            disabled={block.rows.length === 1}
                            className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:text-slate-400"
                          >
                            삭제
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          setConceptForm((current) => ({
                            ...current,
                            blocks: current.blocks.map((entry, index) =>
                              index === blockIndex && entry.type === "table"
                                ? {
                                    ...entry,
                                    rows: [...entry.rows, ["", ""]],
                                  }
                                : entry,
                            ) as ConceptBlockForm[],
                          }))
                        }
                        className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-400"
                      >
                        행 추가
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  handleSaveConcept().catch(() => undefined);
                }}
                disabled={saving || !selectedConceptNodeId}
                className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:bg-slate-400"
              >
                {saving ? "저장 중..." : selectedConceptLesson ? "개념 자료 저장" : "개념 자료 생성"}
              </button>
              {selectedConceptLesson ? (
                <p className="text-sm text-slate-500">마지막 수정 {formatDateTime(selectedConceptLesson.updatedAt)}</p>
              ) : null}
            </div>
          </article>
        </section>
      )}
    </div>
  );
}
