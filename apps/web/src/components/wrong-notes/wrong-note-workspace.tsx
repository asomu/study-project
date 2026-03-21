"use client";

import type { WrongNoteReason } from "@prisma/client";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MetricCard } from "@/components/dashboard/metric-card";
import type { WrongNoteDashboardResponse, WrongNoteItem, WrongNoteListResponse, WrongNoteStudentSummary } from "@/modules/wrong-note/contracts";
import { WRONG_NOTE_REASON_OPTIONS } from "@/modules/wrong-note/constants";

type WorkspaceMode = "student" | "guardian";

type CurriculumNodeOption = {
  id: string;
  unitName: string;
  unitCode: string;
};

type StudentsResponse = {
  students?: WrongNoteStudentSummary[];
};

type ApiErrorPayload = {
  error?: {
    message?: string;
  };
};

type WrongNoteWorkspaceProps = {
  mode: WorkspaceMode;
};

function defaultSemester() {
  return String(new Date().getUTCMonth() < 6 ? 1 : 2);
}

function toApiErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  return (payload as ApiErrorPayload).error?.message ?? fallback;
}

function formatDateLabel(value: string | null) {
  return value ? value.slice(0, 10) : "-";
}

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

export function WrongNoteWorkspace({ mode }: WrongNoteWorkspaceProps) {
  const [students, setStudents] = useState<WrongNoteStudentSummary[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [dashboard, setDashboard] = useState<WrongNoteDashboardResponse | null>(null);
  const [listData, setListData] = useState<WrongNoteListResponse | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState("");
  const [selectedNote, setSelectedNote] = useState<WrongNoteItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loading, setLoading] = useState(mode === "guardian");
  const [detailLoading, setDetailLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [message, setMessage] = useState("");
  const [filters, setFilters] = useState({
    semester: "",
    curriculumNodeId: "",
    reason: "",
    from: "",
    to: "",
    hasFeedback: "",
    page: 1,
  });
  const [filterUnits, setFilterUnits] = useState<CurriculumNodeOption[]>([]);
  const [uploadDraft, setUploadDraft] = useState<{
    file: File | null;
    semester: string;
    curriculumNodeId: string;
    reason: WrongNoteReason;
    studentMemo: string;
  }>({
    file: null,
    semester: defaultSemester(),
    curriculumNodeId: "",
    reason: WRONG_NOTE_REASON_OPTIONS[0].key,
    studentMemo: "",
  });
  const [uploadUnits, setUploadUnits] = useState<CurriculumNodeOption[]>([]);
  const [detailDraft, setDetailDraft] = useState<{
    semester: string;
    curriculumNodeId: string;
    reason: WrongNoteReason;
    studentMemo: string;
    feedbackText: string;
    file: File | null;
  }>({
    semester: defaultSemester(),
    curriculumNodeId: "",
    reason: WRONG_NOTE_REASON_OPTIONS[0].key,
    studentMemo: "",
    feedbackText: "",
    file: null,
  });
  const [detailUnits, setDetailUnits] = useState<CurriculumNodeOption[]>([]);

  const activeStudent = useMemo(() => {
    if (mode === "guardian") {
      return students.find((student) => student.id === selectedStudentId) ?? null;
    }

    return dashboard?.student ?? listData?.student ?? null;
  }, [dashboard?.student, listData?.student, mode, selectedStudentId, students]);

  const titleText =
    mode === "student" ? "사진으로 오답을 남기고, 누적 데이터를 다시 복습합니다" : "학생 오답 데이터를 모아 보호자 피드백으로 연결합니다";
  const descriptionText =
    mode === "student"
      ? "틀린 문제를 바로 찍어 올리고 단원과 실수 이유를 정리하세요. 누적된 오답이 나중에 다시 볼 복습 지도 역할을 합니다."
      : "학생별 오답 누적, 오류유형 분포, 자주 틀리는 단원을 한 화면에서 보고 직접 피드백을 남길 수 있습니다.";

  const dashboardEndpoint =
    mode === "student"
      ? "/api/v1/student/wrong-notes/dashboard"
      : selectedStudentId
        ? `/api/v1/wrong-notes/dashboard?${new URLSearchParams({ studentId: selectedStudentId }).toString()}`
        : "";
  const listEndpoint = useMemo(() => {
    const query = new URLSearchParams();

    if (filters.semester) {
      query.set("semester", filters.semester);
    }

    if (filters.curriculumNodeId) {
      query.set("curriculumNodeId", filters.curriculumNodeId);
    }

    if (filters.reason) {
      query.set("reason", filters.reason);
    }

    if (filters.from) {
      query.set("from", filters.from);
    }

    if (filters.to) {
      query.set("to", filters.to);
    }

    if (filters.hasFeedback) {
      query.set("hasFeedback", filters.hasFeedback);
    }

    query.set("page", String(filters.page));
    query.set("pageSize", "12");

    if (mode === "guardian" && selectedStudentId) {
      query.set("studentId", selectedStudentId);
    }

    const basePath = mode === "student" ? "/api/v1/student/wrong-notes" : "/api/v1/wrong-notes";
    return `${basePath}?${query.toString()}`;
  }, [filters.curriculumNodeId, filters.from, filters.hasFeedback, filters.page, filters.reason, filters.semester, filters.to, mode, selectedStudentId]);

  const loadStudents = useCallback(async () => {
    if (mode !== "guardian") {
      return;
    }

    const response = await fetch("/api/v1/students");
    const payload = (await response.json().catch(() => null)) as StudentsResponse | ApiErrorPayload | null;

    if (!response.ok) {
      throw new Error(toApiErrorMessage(payload, "학생 목록을 불러오지 못했습니다."));
    }

    const items = (payload as StudentsResponse)?.students ?? [];
    setStudents(items);

    if (!selectedStudentId && items[0]) {
      setSelectedStudentId(items[0].id);
    }
  }, [mode, selectedStudentId]);

  const loadCurriculum = useCallback(
    async (student: WrongNoteStudentSummary | null, semester: string) => {
      if (!student || !semester) {
        return [];
      }

      const query = new URLSearchParams({
        schoolLevel: student.schoolLevel,
        grade: String(student.grade),
        semester,
        subject: "math",
        asOfDate: todayDateOnly(),
      });
      const response = await fetch(`/api/v1/curriculum?${query.toString()}`);
      const payload = (await response.json().catch(() => null)) as { nodes?: CurriculumNodeOption[] } | ApiErrorPayload | null;

      if (!response.ok) {
        throw new Error(toApiErrorMessage(payload, "단원 목록을 불러오지 못했습니다."));
      }

      return (payload as { nodes?: CurriculumNodeOption[] })?.nodes ?? [];
    },
    [],
  );

  const loadWorkspace = useCallback(async () => {
    if (mode === "guardian" && !selectedStudentId) {
      return;
    }

    if (!dashboardEndpoint) {
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const [dashboardResponse, listResponse] = await Promise.all([fetch(dashboardEndpoint), fetch(listEndpoint)]);
      const [dashboardPayload, listPayload] = await Promise.all([
        dashboardResponse.json().catch(() => null),
        listResponse.json().catch(() => null),
      ]);

      if (!dashboardResponse.ok) {
        throw new Error(toApiErrorMessage(dashboardPayload, "오답 통계를 불러오지 못했습니다."));
      }

      if (!listResponse.ok) {
        throw new Error(toApiErrorMessage(listPayload, "오답 목록을 불러오지 못했습니다."));
      }

      setDashboard(dashboardPayload as WrongNoteDashboardResponse);
      setListData(listPayload as WrongNoteListResponse);
    } finally {
      setLoading(false);
    }
  }, [dashboardEndpoint, listEndpoint, mode, selectedStudentId]);

  const loadDetail = useCallback(
    async (wrongNoteId: string) => {
      const detailEndpoint =
        mode === "student"
          ? `/api/v1/student/wrong-notes/${wrongNoteId}`
          : `/api/v1/wrong-notes/${wrongNoteId}?${new URLSearchParams({ studentId: selectedStudentId }).toString()}`;

      setSelectedNoteId(wrongNoteId);
      setDetailOpen(true);
      setDetailLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch(detailEndpoint);
        const payload = (await response.json().catch(() => null)) as WrongNoteItem | ApiErrorPayload | null;

        if (!response.ok) {
          throw new Error(toApiErrorMessage(payload, "오답 상세를 불러오지 못했습니다."));
        }

        const detail = payload as WrongNoteItem;

        setSelectedNote(detail);
        setDetailDraft({
          semester: String(detail.curriculum.semester),
          curriculumNodeId: detail.curriculum.curriculumNodeId,
          reason: detail.reason.key,
          studentMemo: detail.studentMemo ?? "",
          feedbackText: detail.feedback?.text ?? "",
          file: null,
        });
      } finally {
        setDetailLoading(false);
      }
    },
    [mode, selectedStudentId],
  );

  useEffect(() => {
    if (mode !== "guardian") {
      loadWorkspace().catch((error: unknown) => {
        setErrorMessage(error instanceof Error ? error.message : "오답 대시보드를 불러오지 못했습니다.");
      });
      return;
    }

    loadStudents().catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : "학생 목록을 불러오지 못했습니다.");
    });
  }, [loadStudents, loadWorkspace, mode]);

  useEffect(() => {
    if (mode !== "guardian" || !selectedStudentId) {
      return;
    }

    loadWorkspace().catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : "오답 대시보드를 불러오지 못했습니다.");
    });
  }, [loadWorkspace, mode, selectedStudentId]);

  useEffect(() => {
    if (!activeStudent) {
      return;
    }

    loadCurriculum(activeStudent, filters.semester)
      .then((nodes) => {
        setFilterUnits(nodes);

        if (!filters.semester) {
          return;
        }

        if (!nodes.some((node) => node.id === filters.curriculumNodeId)) {
          setFilters((prev) => ({
            ...prev,
            curriculumNodeId: "",
          }));
        }
      })
      .catch((error: unknown) => {
        setErrorMessage(error instanceof Error ? error.message : "단원 목록을 불러오지 못했습니다.");
      });
  }, [activeStudent, filters.curriculumNodeId, filters.semester, loadCurriculum]);

  useEffect(() => {
    if (mode !== "student" || !activeStudent) {
      return;
    }

    loadCurriculum(activeStudent, uploadDraft.semester)
      .then((nodes) => {
        setUploadUnits(nodes);
        setUploadDraft((prev) => ({
          ...prev,
          curriculumNodeId: nodes.some((node) => node.id === prev.curriculumNodeId) ? prev.curriculumNodeId : (nodes[0]?.id ?? ""),
        }));
      })
      .catch((error: unknown) => {
        setErrorMessage(error instanceof Error ? error.message : "업로드용 단원 목록을 불러오지 못했습니다.");
      });
  }, [activeStudent, loadCurriculum, mode, uploadDraft.semester]);

  useEffect(() => {
    if (!detailOpen || !activeStudent) {
      return;
    }

    loadCurriculum(activeStudent, detailDraft.semester)
      .then((nodes) => {
        setDetailUnits(nodes);
        setDetailDraft((prev) => ({
          ...prev,
          curriculumNodeId: nodes.some((node) => node.id === prev.curriculumNodeId) ? prev.curriculumNodeId : (nodes[0]?.id ?? ""),
        }));
      })
      .catch((error: unknown) => {
        setErrorMessage(error instanceof Error ? error.message : "상세 단원 목록을 불러오지 못했습니다.");
      });
  }, [activeStudent, detailDraft.semester, detailOpen, loadCurriculum]);

  async function refreshWorkspace(options?: { reopenDetailId?: string }) {
    await loadWorkspace();

    if (options?.reopenDetailId) {
      await loadDetail(options.reopenDetailId);
    }
  }

  async function handleStudentCreate() {
    setErrorMessage("");
    setMessage("");

    if (!uploadDraft.file) {
      setErrorMessage("사진 파일을 먼저 선택해주세요.");
      return;
    }

    if (!uploadDraft.curriculumNodeId) {
      setErrorMessage("단원을 선택해주세요.");
      return;
    }

    const formData = new FormData();
    formData.set("file", uploadDraft.file);
    formData.set("semester", uploadDraft.semester);
    formData.set("curriculumNodeId", uploadDraft.curriculumNodeId);
    formData.set("reason", uploadDraft.reason);
    formData.set("studentMemo", uploadDraft.studentMemo);

    const response = await fetch("/api/v1/student/wrong-notes", {
      method: "POST",
      body: formData,
    });
    const payload = (await response.json().catch(() => null)) as WrongNoteItem | ApiErrorPayload | null;

    if (!response.ok) {
      setErrorMessage(toApiErrorMessage(payload, "오답 업로드에 실패했습니다."));
      return;
    }

    const created = payload as WrongNoteItem;

    setUploadDraft((prev) => ({
      ...prev,
      file: null,
      curriculumNodeId: prev.curriculumNodeId,
      studentMemo: "",
      reason: WRONG_NOTE_REASON_OPTIONS[0].key,
    }));
    setMessage("오답노트를 저장했습니다.");
    await refreshWorkspace({
      reopenDetailId: created.id,
    });
  }

  async function handleStudentSaveDetail() {
    if (!selectedNoteId || !selectedNote) {
      return;
    }

    setErrorMessage("");
    setMessage("");

    const patchPayload: Record<string, unknown> = {};

    if (
      detailDraft.curriculumNodeId !== selectedNote.curriculum.curriculumNodeId ||
      detailDraft.semester !== String(selectedNote.curriculum.semester)
    ) {
      patchPayload.curriculumNodeId = detailDraft.curriculumNodeId;
      patchPayload.semester = Number(detailDraft.semester);
    }

    if (detailDraft.reason !== selectedNote.reason.key) {
      patchPayload.reason = detailDraft.reason;
    }

    if (detailDraft.studentMemo !== (selectedNote.studentMemo ?? "")) {
      patchPayload.studentMemo = detailDraft.studentMemo;
    }

    if (Object.keys(patchPayload).length) {
      const patchResponse = await fetch(`/api/v1/student/wrong-notes/${selectedNoteId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(patchPayload),
      });
      const patchPayloadBody = (await patchResponse.json().catch(() => null)) as WrongNoteItem | ApiErrorPayload | null;

      if (!patchResponse.ok) {
        setErrorMessage(toApiErrorMessage(patchPayloadBody, "오답 수정에 실패했습니다."));
        return;
      }
    }

    if (detailDraft.file) {
      const formData = new FormData();
      formData.set("file", detailDraft.file);

      const imageResponse = await fetch(`/api/v1/student/wrong-notes/${selectedNoteId}/image`, {
        method: "POST",
        body: formData,
      });
      const imagePayload = (await imageResponse.json().catch(() => null)) as { imagePath?: string } | ApiErrorPayload | null;

      if (!imageResponse.ok) {
        setErrorMessage(toApiErrorMessage(imagePayload, "이미지 교체에 실패했습니다."));
        return;
      }
    }

    setMessage("오답 상세를 저장했습니다.");
    await refreshWorkspace({
      reopenDetailId: selectedNoteId,
    });
  }

  async function handleStudentDelete() {
    if (!selectedNoteId) {
      return;
    }

    if (!window.confirm("이 오답노트를 삭제할까요?")) {
      return;
    }

    setErrorMessage("");
    setMessage("");

    const response = await fetch(`/api/v1/student/wrong-notes/${selectedNoteId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;
      setErrorMessage(toApiErrorMessage(payload, "오답 삭제에 실패했습니다."));
      return;
    }

    setDetailOpen(false);
    setSelectedNote(null);
    setSelectedNoteId("");
    setMessage("오답노트를 삭제했습니다.");
    await loadWorkspace();
  }

  async function handleGuardianSaveFeedback() {
    if (!selectedNoteId) {
      return;
    }

    setErrorMessage("");
    setMessage("");

    const response = await fetch(`/api/v1/wrong-notes/${selectedNoteId}/feedback`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        text: detailDraft.feedbackText,
      }),
    });
    const payload = (await response.json().catch(() => null)) as WrongNoteItem | ApiErrorPayload | null;

    if (!response.ok) {
      setErrorMessage(toApiErrorMessage(payload, "보호자 피드백 저장에 실패했습니다."));
      return;
    }

    setMessage("보호자 피드백을 저장했습니다.");
    await refreshWorkspace({
      reopenDetailId: selectedNoteId,
    });
  }

  const topReason = useMemo(() => {
    if (!dashboard) {
      return null;
    }

    return [...dashboard.reasonDistribution].sort((left, right) => right.count - left.count)[0] ?? null;
  }, [dashboard]);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_45%),linear-gradient(135deg,_#0f172a,_#1e293b_55%,_#0f766e)] px-5 py-6 text-white">
          <p className="font-mono text-xs tracking-[0.28em] uppercase text-cyan-200">
            {mode === "student" ? "Wrong Note Home" : "Guardian Wrong Note Hub"}
          </p>
          <h2 className="mt-3 text-2xl font-semibold">{titleText}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-100">{descriptionText}</p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm text-cyan-100">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
              {activeStudent ? `${activeStudent.name} · 중${activeStudent.grade}` : "학생 선택 필요"}
            </span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
              {dashboard?.summary.totalNotes ?? 0}건 누적
            </span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
              최다 오류유형 {topReason?.labelKo ?? "-"}
            </span>
          </div>
        </div>
      </section>

      {mode === "guardian" ? (
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">학생 선택</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="space-y-1 text-sm text-slate-700">
              <span>학생</span>
              <select
                value={selectedStudentId}
                onChange={(event) => {
                  setSelectedStudentId(event.target.value);
                  setFilters((prev) => ({
                    ...prev,
                    page: 1,
                    curriculumNodeId: "",
                  }));
                }}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              >
                <option value="">학생 선택</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} ({student.schoolLevel}-{student.grade}학년)
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                loadWorkspace().catch((error: unknown) => {
                  setErrorMessage(error instanceof Error ? error.message : "오답 대시보드를 불러오지 못했습니다.");
                });
              }}
              className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            >
              새로고침
            </button>
          </div>
        </section>
      ) : null}

      {mode === "student" ? (
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs tracking-[0.24em] uppercase text-teal-700">Quick Upload</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-950">사진 1장으로 오답 1건을 기록합니다</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                파일, 학기, 단원, 오류유형을 정리하면 이후 통계와 보호자 피드백에 바로 반영됩니다.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm text-slate-700">
              <span>사진 파일</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
                onChange={(event) =>
                  setUploadDraft((prev) => ({
                    ...prev,
                    file: event.target.files?.[0] ?? null,
                  }))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span>학년</span>
              <input value={activeStudent ? `중${activeStudent.grade}` : "-"} disabled className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" />
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span>학기</span>
              <select
                value={uploadDraft.semester}
                onChange={(event) =>
                  setUploadDraft((prev) => ({
                    ...prev,
                    semester: event.target.value,
                    curriculumNodeId: "",
                  }))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              >
                <option value="1">1학기</option>
                <option value="2">2학기</option>
              </select>
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span>단원</span>
              <select
                value={uploadDraft.curriculumNodeId}
                onChange={(event) =>
                  setUploadDraft((prev) => ({
                    ...prev,
                    curriculumNodeId: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              >
                <option value="">단원 선택</option>
                {uploadUnits.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.unitName}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr]">
            <label className="space-y-1 text-sm text-slate-700">
              <span>오류유형</span>
              <select
                value={uploadDraft.reason}
                onChange={(event) =>
                  setUploadDraft((prev) => ({
                    ...prev,
                    reason: event.target.value as WrongNoteReason,
                  }))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              >
                {WRONG_NOTE_REASON_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.labelKo}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span>학생 메모</span>
              <textarea
                value={uploadDraft.studentMemo}
                onChange={(event) =>
                  setUploadDraft((prev) => ({
                    ...prev,
                    studentMemo: event.target.value,
                  }))
                }
                rows={3}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                placeholder="왜 틀렸는지 짧게 적어두면 나중에 다시 보기 쉽습니다."
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                handleStudentCreate().catch((error: unknown) => {
                  setErrorMessage(error instanceof Error ? error.message : "오답 업로드에 실패했습니다.");
                });
              }}
              className="rounded-full bg-slate-950 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            >
              오답노트 저장
            </button>
            <span className="text-sm text-slate-500">{uploadDraft.file ? uploadDraft.file.name : "아직 선택한 파일이 없습니다."}</span>
          </div>
        </section>
      ) : null}

      {errorMessage ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{errorMessage}</p> : null}
      {message ? <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</p> : null}

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="총 오답 수" value={`${dashboard?.summary.totalNotes ?? 0}건`} description="삭제되지 않은 전체 누적 오답" />
        <MetricCard label="최근 30일" value={`${dashboard?.summary.recent30DaysNotes ?? 0}건`} description="최근 30일 안에 새로 기록된 오답" />
        <MetricCard label="피드백 완료" value={`${dashboard?.summary.feedbackCompletedNotes ?? 0}건`} description="보호자 피드백이 남아 있는 오답" />
        {WRONG_NOTE_REASON_OPTIONS.map((option) => (
          <MetricCard
            key={option.key}
            label={option.labelKo}
            value={`${dashboard?.summary.reasonCounts[option.key] ?? 0}건`}
            description="오류유형별 누적 개수"
          />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">자주 틀리는 단원</h3>
              <p className="mt-1 text-xs text-slate-500">누적 오답 기준 상위 5개 단원 분포</p>
            </div>
            {activeStudent ? (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                {activeStudent.name}
              </span>
            ) : null}
          </div>
          <div className="mt-4 space-y-3">
            {dashboard?.topUnits.length ? (
              dashboard.topUnits.map((unit, index) => (
                <div key={unit.curriculumNodeId} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-slate-500">TOP {index + 1}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{unit.unitName}</p>
                    </div>
                    <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-teal-700">{unit.count}건</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                아직 누적된 오답이 없어 단원 분포를 계산할 수 없습니다.
              </div>
            )}
          </div>
        </article>

        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">오답 탐색 필터</h3>
              <p className="mt-1 text-xs text-slate-500">학기, 단원, 오류유형, 기간, 피드백 여부로 원하는 오답만 다시 찾습니다.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setFilters({
                  semester: "",
                  curriculumNodeId: "",
                  reason: "",
                  from: "",
                  to: "",
                  hasFeedback: "",
                  page: 1,
                });
              }}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400"
            >
              필터 초기화
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <label className="space-y-1 text-sm text-slate-700">
              <span>학년</span>
              <input value={activeStudent ? `중${activeStudent.grade}` : "-"} disabled className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" />
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span>학기</span>
              <select
                value={filters.semester}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    semester: event.target.value,
                    curriculumNodeId: "",
                    page: 1,
                  }))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              >
                <option value="">전체 학기</option>
                <option value="1">1학기</option>
                <option value="2">2학기</option>
              </select>
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span>단원</span>
              <select
                value={filters.curriculumNodeId}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    curriculumNodeId: event.target.value,
                    page: 1,
                  }))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              >
                <option value="">전체 단원</option>
                {filterUnits.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.unitName}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span>오류유형</span>
              <select
                value={filters.reason}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    reason: event.target.value,
                    page: 1,
                  }))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              >
                <option value="">전체 오류유형</option>
                {WRONG_NOTE_REASON_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.labelKo}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span>시작일</span>
              <input
                type="date"
                value={filters.from}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    from: event.target.value,
                    page: 1,
                  }))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span>종료일</span>
              <input
                type="date"
                value={filters.to}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    to: event.target.value,
                    page: 1,
                  }))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="space-y-1 text-sm text-slate-700">
              <span>피드백 여부</span>
              <select
                value={filters.hasFeedback}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    hasFeedback: event.target.value,
                    page: 1,
                  }))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              >
                <option value="">전체</option>
                <option value="true">피드백 있음</option>
                <option value="false">피드백 없음</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                loadWorkspace().catch((error: unknown) => {
                  setErrorMessage(error instanceof Error ? error.message : "오답 목록을 불러오지 못했습니다.");
                });
              }}
              className="mt-6 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            >
              {loading ? "조회 중..." : "필터 적용"}
            </button>
          </div>
        </article>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">오답 카드</h3>
            <p className="mt-1 text-sm text-slate-500">
              {listData ? `총 ${listData.pagination.totalItems}건 중 ${listData.wrongNotes.length}건 표시` : "오답 목록을 불러오는 중입니다."}
            </p>
          </div>
          {listData ? (
            <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
              페이지 {listData.pagination.page} / {listData.pagination.totalPages}
            </div>
          ) : null}
        </div>

        {!listData?.wrongNotes.length ? (
          <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-sm text-slate-600">
            조건에 맞는 오답노트가 없습니다. 학생이 새 오답을 올리거나 필터를 조정해 보세요.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {listData.wrongNotes.map((wrongNote) => (
              <button
                type="button"
                key={wrongNote.id}
                onClick={() => {
                  loadDetail(wrongNote.id).catch((error: unknown) => {
                    setErrorMessage(error instanceof Error ? error.message : "오답 상세를 불러오지 못했습니다.");
                  });
                }}
                className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
              >
                <div className="aspect-[4/3] bg-slate-100">
                  <Image
                    src={wrongNote.imagePath}
                    alt={wrongNote.curriculum.unitName}
                    width={1200}
                    height={900}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{wrongNote.curriculum.unitName}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        중{wrongNote.curriculum.grade} · {wrongNote.curriculum.semester}학기 · {formatDateLabel(wrongNote.createdAt)}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
                      {wrongNote.reason.labelKo}
                    </span>
                  </div>
                  <p className="line-clamp-3 min-h-[3.5rem] text-sm leading-6 text-slate-600">
                    {wrongNote.studentMemo ?? "학생 메모가 아직 없습니다."}
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        wrongNote.feedback ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {wrongNote.feedback ? "피드백 있음" : "피드백 대기"}
                    </span>
                    <span className="text-xs font-semibold text-sky-700">상세 보기</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {listData ? (
          <div className="flex items-center justify-between gap-3 rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <button
              type="button"
              disabled={listData.pagination.page <= 1}
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  page: Math.max(1, prev.page - 1),
                }))
              }
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              이전
            </button>
            <p className="text-sm text-slate-500">
              {listData.pagination.totalItems}건 중 {(listData.pagination.page - 1) * listData.pagination.pageSize + 1}-
              {Math.min(listData.pagination.page * listData.pagination.pageSize, listData.pagination.totalItems)}건
            </p>
            <button
              type="button"
              disabled={listData.pagination.page >= listData.pagination.totalPages}
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  page: prev.page + 1,
                }))
              }
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              다음
            </button>
          </div>
        ) : null}
      </section>

      {detailOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/55 backdrop-blur-sm">
          <div className="h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs tracking-[0.24em] uppercase text-teal-700">Wrong Note Detail</p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-950">
                    {selectedNote?.curriculum.unitName ?? "오답 상세"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDetailOpen(false);
                    setSelectedNote(null);
                    setSelectedNoteId("");
                  }}
                  className="rounded-full border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700"
                >
                  닫기
                </button>
              </div>
            </div>

            <div className="space-y-5 px-5 py-5">
              {detailLoading ? (
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">상세 정보를 불러오는 중입니다.</p>
              ) : selectedNote ? (
                <>
                  <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50">
                    <Image
                      src={selectedNote.imagePath}
                      alt={selectedNote.curriculum.unitName}
                      width={1200}
                      height={900}
                      className="h-auto w-full object-cover"
                      unoptimized
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-medium text-slate-500">업로드일</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{formatDateLabel(selectedNote.createdAt)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-medium text-slate-500">피드백 상태</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{selectedNote.feedback ? "완료" : "대기"}</p>
                    </div>
                  </div>

                  {mode === "student" ? (
                    <>
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="space-y-1 text-sm text-slate-700">
                          <span>학기</span>
                          <select
                            value={detailDraft.semester}
                            onChange={(event) =>
                              setDetailDraft((prev) => ({
                                ...prev,
                                semester: event.target.value,
                                curriculumNodeId: "",
                              }))
                            }
                            className="w-full rounded-xl border border-slate-300 px-3 py-2"
                          >
                            <option value="1">1학기</option>
                            <option value="2">2학기</option>
                          </select>
                        </label>
                        <label className="space-y-1 text-sm text-slate-700">
                          <span>단원</span>
                          <select
                            value={detailDraft.curriculumNodeId}
                            onChange={(event) =>
                              setDetailDraft((prev) => ({
                                ...prev,
                                curriculumNodeId: event.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-slate-300 px-3 py-2"
                          >
                            {detailUnits.map((node) => (
                              <option key={node.id} value={node.id}>
                                {node.unitName}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="space-y-1 text-sm text-slate-700">
                          <span>오류유형</span>
                          <select
                            value={detailDraft.reason}
                            onChange={(event) =>
                              setDetailDraft((prev) => ({
                                ...prev,
                                reason: event.target.value as WrongNoteReason,
                              }))
                            }
                            className="w-full rounded-xl border border-slate-300 px-3 py-2"
                          >
                            {WRONG_NOTE_REASON_OPTIONS.map((option) => (
                              <option key={option.key} value={option.key}>
                                {option.labelKo}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="space-y-1 text-sm text-slate-700">
                          <span>사진 교체</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
                            onChange={(event) =>
                              setDetailDraft((prev) => ({
                                ...prev,
                                file: event.target.files?.[0] ?? null,
                              }))
                            }
                            className="w-full rounded-xl border border-slate-300 px-3 py-2"
                          />
                        </label>
                      </div>
                      <label className="block space-y-1 text-sm text-slate-700">
                        <span>학생 메모</span>
                        <textarea
                          value={detailDraft.studentMemo}
                          onChange={(event) =>
                            setDetailDraft((prev) => ({
                              ...prev,
                              studentMemo: event.target.value,
                            }))
                          }
                          rows={5}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2"
                        />
                      </label>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-slate-900">보호자 피드백</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {selectedNote.feedback?.text ?? "아직 보호자 피드백이 없습니다."}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">최근 갱신 {formatDateLabel(selectedNote.feedback?.updatedAt ?? null)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            handleStudentSaveDetail().catch((error: unknown) => {
                              setErrorMessage(error instanceof Error ? error.message : "오답 상세 저장에 실패했습니다.");
                            });
                          }}
                          className="rounded-full bg-slate-950 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-800"
                        >
                          수정 저장
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleStudentDelete().catch((error: unknown) => {
                              setErrorMessage(error instanceof Error ? error.message : "오답 삭제에 실패했습니다.");
                            });
                          }}
                          className="rounded-full border border-rose-300 px-5 py-2 text-sm font-semibold text-rose-700 hover:border-rose-400"
                        >
                          삭제
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-medium text-slate-500">단원</p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">{selectedNote.curriculum.unitName}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-medium text-slate-500">오류유형</p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">{selectedNote.reason.labelKo}</p>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-slate-900">학생 메모</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {selectedNote.studentMemo ?? "학생 메모가 아직 없습니다."}
                        </p>
                      </div>
                      <label className="block space-y-1 text-sm text-slate-700">
                        <span>보호자 피드백</span>
                        <textarea
                          value={detailDraft.feedbackText}
                          onChange={(event) =>
                            setDetailDraft((prev) => ({
                              ...prev,
                              feedbackText: event.target.value,
                            }))
                          }
                          rows={6}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2"
                          placeholder="학생이 다시 볼 수 있도록 짧고 명확한 코멘트를 남겨주세요."
                        />
                      </label>
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            handleGuardianSaveFeedback().catch((error: unknown) => {
                              setErrorMessage(error instanceof Error ? error.message : "피드백 저장에 실패했습니다.");
                            });
                          }}
                          className="rounded-full bg-slate-950 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-800"
                        >
                          피드백 저장
                        </button>
                        <span className="text-sm text-slate-500">빈 값으로 저장하면 기존 피드백을 비울 수 있습니다.</span>
                      </div>
                    </>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
