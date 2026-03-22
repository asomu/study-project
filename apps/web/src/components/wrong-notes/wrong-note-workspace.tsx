"use client";

import type { SchoolLevel, WrongNoteReason } from "@prisma/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { WrongNoteBarChart } from "@/components/wrong-notes/wrong-note-bar-chart";
import { WrongNoteImage } from "@/components/wrong-notes/wrong-note-image";
import { getNextWorkbookProgressStatus, getWorkbookProgressStatusLabel } from "@/modules/workbook/constants";
import type {
  StudentWorkbookItem,
  WorkbookProgressDashboardResponse,
  WorkbookProgressStageState,
  WorkbookTemplateItem,
} from "@/modules/workbook/contracts";
import type {
  WrongNoteChartDimension,
  WrongNoteChartResponse,
  WrongNoteDashboardResponse,
  WrongNoteItem,
  WrongNoteListResponse,
  WrongNoteStudentSummary,
} from "@/modules/wrong-note/contracts";
import {
  formatSchoolGradeLabel,
  getGradeOptionsForSchoolLevel,
  WRONG_NOTE_CHART_DIMENSION_OPTIONS,
  WRONG_NOTE_REASON_OPTIONS,
} from "@/modules/wrong-note/constants";

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

type WorkbookTemplateResponse = {
  workbookTemplates?: WorkbookTemplateItem[];
};

type StudentWorkbookListResponse = {
  student?: WrongNoteStudentSummary;
  studentWorkbooks?: StudentWorkbookItem[];
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
  const [chartData, setChartData] = useState<WrongNoteChartResponse["chart"] | null>(null);
  const [workbookDashboard, setWorkbookDashboard] = useState<WorkbookProgressDashboardResponse | null>(null);
  const [workbookTemplates, setWorkbookTemplates] = useState<WorkbookTemplateItem[]>([]);
  const [assignedWorkbooks, setAssignedWorkbooks] = useState<StudentWorkbookItem[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState("");
  const [selectedNote, setSelectedNote] = useState<WrongNoteItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loading, setLoading] = useState(mode === "guardian");
  const [chartLoading, setChartLoading] = useState(mode === "guardian");
  const [workbookLoading, setWorkbookLoading] = useState(mode === "guardian");
  const [detailLoading, setDetailLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [message, setMessage] = useState("");
  const [chartControls, setChartControls] = useState<{
    dimension: WrongNoteChartDimension;
    grade: string;
    semester: string;
  }>({
    dimension: WRONG_NOTE_CHART_DIMENSION_OPTIONS[0].key,
    grade: "",
    semester: defaultSemester(),
  });
  const [workbookControls, setWorkbookControls] = useState({
    grade: "",
    studentWorkbookId: "",
  });
  const [templateDraft, setTemplateDraft] = useState<{
    title: string;
    publisher: string;
    schoolLevel: SchoolLevel;
    grade: string;
    semester: string;
    stages: string[];
  }>({
    title: "",
    publisher: "",
    schoolLevel: "middle",
    grade: "",
    semester: defaultSemester(),
    stages: ["개념원리 이해", "핵심문제 익히기", "중단원 마무리하기", "서술형 대비문제"],
  });
  const [assignmentDraft, setAssignmentDraft] = useState({
    workbookTemplateId: "",
  });
  const [filters, setFilters] = useState({
    grade: "",
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
    grade: string;
    semester: string;
    curriculumNodeId: string;
    reason: WrongNoteReason;
    studentMemo: string;
    studentWorkbookId: string;
    workbookTemplateStageId: string;
  }>({
    file: null,
    grade: "",
    semester: defaultSemester(),
    curriculumNodeId: "",
    reason: WRONG_NOTE_REASON_OPTIONS[0].key,
    studentMemo: "",
    studentWorkbookId: "",
    workbookTemplateStageId: "",
  });
  const [uploadUnits, setUploadUnits] = useState<CurriculumNodeOption[]>([]);
  const [detailDraft, setDetailDraft] = useState<{
    grade: string;
    semester: string;
    curriculumNodeId: string;
    reason: WrongNoteReason;
    studentMemo: string;
    feedbackText: string;
    file: File | null;
    studentWorkbookId: string;
    workbookTemplateStageId: string;
  }>({
    grade: "",
    semester: defaultSemester(),
    curriculumNodeId: "",
    reason: WRONG_NOTE_REASON_OPTIONS[0].key,
    studentMemo: "",
    feedbackText: "",
    file: null,
    studentWorkbookId: "",
    workbookTemplateStageId: "",
  });
  const [detailUnits, setDetailUnits] = useState<CurriculumNodeOption[]>([]);

  const activeStudent = useMemo(() => {
    if (mode === "guardian") {
      return students.find((student) => student.id === selectedStudentId) ?? null;
    }

    return dashboard?.student ?? listData?.student ?? null;
  }, [dashboard?.student, listData?.student, mode, selectedStudentId, students]);
  const activeStudentId = activeStudent?.id ?? "";
  const activeStudentGrade = activeStudent?.grade ?? null;

  const titleText =
    mode === "student" ? "사진으로 오답을 남기고, 누적 데이터를 다시 복습합니다" : "학생 오답 데이터를 모아 보호자 피드백으로 연결합니다";
  const descriptionText =
    mode === "student"
      ? "틀린 문제를 바로 찍어 올리고 단원과 실수 이유를 정리하세요. 누적된 오답이 나중에 다시 볼 복습 지도 역할을 합니다."
      : "학생별 오답 누적, 오류유형 분포, 단원별 바 차트를 한 화면에서 보고 직접 피드백을 남길 수 있습니다.";

  const gradeOptions = useMemo(() => {
    return activeStudent ? getGradeOptionsForSchoolLevel(activeStudent.schoolLevel) : [];
  }, [activeStudent]);
  const workbookSelectorOptions = useMemo(() => workbookDashboard?.availableWorkbooks ?? [], [workbookDashboard?.availableWorkbooks]);
  const uploadSelectedWorkbook = useMemo(
    () => workbookSelectorOptions.find((workbook) => workbook.id === uploadDraft.studentWorkbookId) ?? null,
    [uploadDraft.studentWorkbookId, workbookSelectorOptions],
  );
  const detailSelectedWorkbook = useMemo(
    () => workbookSelectorOptions.find((workbook) => workbook.id === detailDraft.studentWorkbookId) ?? null,
    [detailDraft.studentWorkbookId, workbookSelectorOptions],
  );
  const workbookOptionsForSelectedGrade = useMemo(() => {
    if (!workbookControls.grade) {
      return workbookSelectorOptions;
    }

    return workbookSelectorOptions.filter((workbook) => workbook.template.grade === Number(workbookControls.grade));
  }, [workbookControls.grade, workbookSelectorOptions]);
  const guardianTemplateOptions = useMemo(() => {
    if (!activeStudent) {
      return workbookTemplates;
    }

    return workbookTemplates.filter((template) => template.schoolLevel === activeStudent.schoolLevel);
  }, [activeStudent, workbookTemplates]);
  const workbookDashboardEndpoint = useMemo(() => {
    const query = new URLSearchParams();

    if (workbookControls.grade) {
      query.set("grade", workbookControls.grade);
    }

    if (workbookControls.studentWorkbookId) {
      query.set("studentWorkbookId", workbookControls.studentWorkbookId);
    }

    if (mode === "guardian") {
      if (!selectedStudentId) {
        return "";
      }

      query.set("studentId", selectedStudentId);
      return `/api/v1/workbook-progress/dashboard?${query.toString()}`;
    }

    return `/api/v1/student/workbook-progress/dashboard?${query.toString()}`;
  }, [mode, selectedStudentId, workbookControls.grade, workbookControls.studentWorkbookId]);
  const guardianAssignedWorkbooksEndpoint =
    mode === "guardian" && selectedStudentId
      ? `/api/v1/student-workbooks?${new URLSearchParams({ studentId: selectedStudentId }).toString()}`
      : "";

  const dashboardEndpoint =
    mode === "student"
      ? "/api/v1/student/wrong-notes/dashboard"
      : selectedStudentId
        ? `/api/v1/wrong-notes/dashboard?${new URLSearchParams({ studentId: selectedStudentId }).toString()}`
        : "";
  const listEndpoint = useMemo(() => {
    const query = new URLSearchParams();

    if (filters.grade) {
      query.set("grade", filters.grade);
    }

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
  }, [filters.curriculumNodeId, filters.from, filters.grade, filters.hasFeedback, filters.page, filters.reason, filters.semester, filters.to, mode, selectedStudentId]);
  const chartEndpoint = useMemo(() => {
    if (!chartControls.grade || !chartControls.semester) {
      return "";
    }

    const query = new URLSearchParams({
      dimension: chartControls.dimension,
      grade: chartControls.grade,
      semester: chartControls.semester,
    });

    if (mode === "guardian" && selectedStudentId) {
      query.set("studentId", selectedStudentId);
    }

    const basePath = mode === "student" ? "/api/v1/student/wrong-notes/chart" : "/api/v1/wrong-notes/chart";
    return `${basePath}?${query.toString()}`;
  }, [chartControls.dimension, chartControls.grade, chartControls.semester, mode, selectedStudentId]);

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

  const loadWorkbookTemplates = useCallback(async () => {
    if (mode !== "guardian") {
      return;
    }

    const response = await fetch("/api/v1/workbook-templates");
    const payload = (await response.json().catch(() => null)) as WorkbookTemplateResponse | ApiErrorPayload | null;

    if (!response.ok) {
      throw new Error(toApiErrorMessage(payload, "문제집 템플릿을 불러오지 못했습니다."));
    }

    setWorkbookTemplates((payload as WorkbookTemplateResponse).workbookTemplates ?? []);
  }, [mode]);

  const loadAssignedWorkbooks = useCallback(async () => {
    if (mode !== "guardian") {
      return;
    }

    if (!guardianAssignedWorkbooksEndpoint) {
      setAssignedWorkbooks([]);
      return;
    }

    const response = await fetch(guardianAssignedWorkbooksEndpoint);
    const payload = (await response.json().catch(() => null)) as StudentWorkbookListResponse | ApiErrorPayload | null;

    if (!response.ok) {
      throw new Error(toApiErrorMessage(payload, "학생 문제집 배정 목록을 불러오지 못했습니다."));
    }

    setAssignedWorkbooks((payload as StudentWorkbookListResponse).studentWorkbooks ?? []);
  }, [guardianAssignedWorkbooksEndpoint, mode]);

  const loadCurriculum = useCallback(
    async (student: WrongNoteStudentSummary | null, grade: string, semester: string) => {
      if (!student || !grade || !semester) {
        return [];
      }

      const query = new URLSearchParams({
        schoolLevel: student.schoolLevel,
        grade,
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

  const loadChart = useCallback(async () => {
    if (mode === "guardian" && !selectedStudentId) {
      setChartData(null);
      setChartLoading(false);
      return;
    }

    if (!chartEndpoint) {
      setChartData(null);
      setChartLoading(false);
      return;
    }

    setChartLoading(true);

    try {
      const response = await fetch(chartEndpoint);
      const payload = (await response.json().catch(() => null)) as WrongNoteChartResponse | ApiErrorPayload | null;

      if (!response.ok) {
        throw new Error(toApiErrorMessage(payload, "오답 그래프를 불러오지 못했습니다."));
      }

      setChartData((payload as WrongNoteChartResponse).chart);
    } finally {
      setChartLoading(false);
    }
  }, [chartEndpoint, mode, selectedStudentId]);

  const loadWorkbookDashboard = useCallback(async () => {
    if (mode === "guardian" && !selectedStudentId) {
      setWorkbookDashboard(null);
      setWorkbookLoading(false);
      return;
    }

    if (!workbookDashboardEndpoint) {
      setWorkbookDashboard(null);
      setWorkbookLoading(false);
      return;
    }

    setWorkbookLoading(true);

    try {
      const response = await fetch(workbookDashboardEndpoint);
      const payload = (await response.json().catch(() => null)) as WorkbookProgressDashboardResponse | ApiErrorPayload | null;

      if (!response.ok) {
        throw new Error(toApiErrorMessage(payload, "문제집 진도 현황을 불러오지 못했습니다."));
      }

      const data = payload as WorkbookProgressDashboardResponse;
      setWorkbookDashboard(data);
      setWorkbookControls((prev) => {
        const nextGrade = prev.grade || String(data.selectedWorkbook?.grade ?? activeStudent?.grade ?? "");
        const nextStudentWorkbookId = data.selectedWorkbook?.studentWorkbookId ?? "";

        if (prev.grade === nextGrade && prev.studentWorkbookId === nextStudentWorkbookId) {
          return prev;
        }

        return {
          grade: nextGrade,
          studentWorkbookId: nextStudentWorkbookId,
        };
      });
    } finally {
      setWorkbookLoading(false);
    }
  }, [activeStudent?.grade, mode, selectedStudentId, workbookDashboardEndpoint]);

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
          grade: String(detail.curriculum.grade),
          semester: String(detail.curriculum.semester),
          curriculumNodeId: detail.curriculum.curriculumNodeId,
          reason: detail.reason.key,
          studentMemo: detail.studentMemo ?? "",
          feedbackText: detail.feedback?.text ?? "",
          file: null,
          studentWorkbookId: detail.workbook?.studentWorkbookId ?? "",
          workbookTemplateStageId: detail.workbook?.stageId ?? "",
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
      loadWorkbookDashboard().catch((error: unknown) => {
        setErrorMessage(error instanceof Error ? error.message : "문제집 진도 현황을 불러오지 못했습니다.");
      });
      return;
    }

    loadStudents().catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : "학생 목록을 불러오지 못했습니다.");
    });
    loadWorkbookTemplates().catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : "문제집 템플릿을 불러오지 못했습니다.");
    });
  }, [loadStudents, loadWorkbookDashboard, loadWorkbookTemplates, loadWorkspace, mode]);

  useEffect(() => {
    if (mode !== "guardian" || !selectedStudentId) {
      return;
    }

    loadWorkspace().catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : "오답 대시보드를 불러오지 못했습니다.");
    });
    loadWorkbookDashboard().catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : "문제집 진도 현황을 불러오지 못했습니다.");
    });
    loadAssignedWorkbooks().catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : "학생 문제집 배정 목록을 불러오지 못했습니다.");
    });
  }, [loadAssignedWorkbooks, loadWorkbookDashboard, loadWorkspace, mode, selectedStudentId]);

  useEffect(() => {
    if (!activeStudentId || activeStudentGrade === null) {
      return;
    }

    setChartControls((prev) => ({
      ...prev,
      grade: String(activeStudentGrade),
      semester: defaultSemester(),
    }));
    setWorkbookControls({
      grade: String(activeStudentGrade),
      studentWorkbookId: "",
    });
    setTemplateDraft((prev) => ({
      ...prev,
      schoolLevel: activeStudent?.schoolLevel ?? prev.schoolLevel,
      grade: String(activeStudentGrade),
    }));
  }, [activeStudent?.schoolLevel, activeStudentGrade, activeStudentId]);

  useEffect(() => {
    if ((mode === "guardian" && !selectedStudentId) || !activeStudent) {
      if (mode === "guardian" && !selectedStudentId) {
        setChartData(null);
      }
      return;
    }

    loadChart().catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : "오답 그래프를 불러오지 못했습니다.");
    });
  }, [activeStudent, loadChart, mode, selectedStudentId]);

  useEffect(() => {
    if ((mode === "guardian" && !selectedStudentId) || !activeStudent) {
      if (mode === "guardian" && !selectedStudentId) {
        setWorkbookDashboard(null);
      }
      return;
    }

    loadWorkbookDashboard().catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : "문제집 진도 현황을 불러오지 못했습니다.");
    });
  }, [activeStudent, loadWorkbookDashboard, mode, selectedStudentId]);

  useEffect(() => {
    if (!activeStudent) {
      return;
    }

    if (filters.grade && !gradeOptions.includes(Number(filters.grade))) {
      setFilters((prev) => ({
        ...prev,
        grade: "",
        curriculumNodeId: "",
      }));
      return;
    }

    loadCurriculum(activeStudent, filters.grade, filters.semester)
      .then((nodes) => {
        setFilterUnits(nodes);

        if (!filters.grade || !filters.semester) {
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
  }, [activeStudent, filters.curriculumNodeId, filters.grade, filters.semester, gradeOptions, loadCurriculum]);

  useEffect(() => {
    if (mode !== "student" || !activeStudent) {
      return;
    }

    setUploadDraft((prev) => {
      const nextGrade = gradeOptions.includes(Number(prev.grade)) ? prev.grade : String(activeStudent.grade);

      return {
        ...prev,
        grade: nextGrade,
        curriculumNodeId: nextGrade === prev.grade ? prev.curriculumNodeId : "",
      };
    });
  }, [activeStudent, gradeOptions, mode]);

  useEffect(() => {
    if (!uploadSelectedWorkbook) {
      setUploadDraft((prev) => ({
        ...prev,
        workbookTemplateStageId: prev.studentWorkbookId ? prev.workbookTemplateStageId : "",
      }));
      return;
    }

    setUploadDraft((prev) => ({
      ...prev,
      grade: String(uploadSelectedWorkbook.template.grade),
      semester: String(uploadSelectedWorkbook.template.semester),
      curriculumNodeId:
        prev.grade === String(uploadSelectedWorkbook.template.grade) &&
        prev.semester === String(uploadSelectedWorkbook.template.semester)
          ? prev.curriculumNodeId
          : "",
      workbookTemplateStageId: uploadSelectedWorkbook.template.stages.some((stage) => stage.id === prev.workbookTemplateStageId)
        ? prev.workbookTemplateStageId
        : (uploadSelectedWorkbook.template.stages[0]?.id ?? ""),
    }));
  }, [uploadSelectedWorkbook]);

  useEffect(() => {
    if (mode !== "student" || !activeStudent) {
      return;
    }

    loadCurriculum(activeStudent, uploadDraft.grade, uploadDraft.semester)
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
  }, [activeStudent, loadCurriculum, mode, uploadDraft.grade, uploadDraft.semester]);

  useEffect(() => {
    if (!detailOpen || !activeStudent) {
      return;
    }

    loadCurriculum(activeStudent, detailDraft.grade, detailDraft.semester)
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
  }, [activeStudent, detailDraft.grade, detailDraft.semester, detailOpen, loadCurriculum]);

  useEffect(() => {
    if (!detailSelectedWorkbook) {
      setDetailDraft((prev) => ({
        ...prev,
        workbookTemplateStageId: prev.studentWorkbookId ? prev.workbookTemplateStageId : "",
      }));
      return;
    }

    setDetailDraft((prev) => ({
      ...prev,
      grade: String(detailSelectedWorkbook.template.grade),
      semester: String(detailSelectedWorkbook.template.semester),
      curriculumNodeId:
        prev.grade === String(detailSelectedWorkbook.template.grade) &&
        prev.semester === String(detailSelectedWorkbook.template.semester)
          ? prev.curriculumNodeId
          : "",
      workbookTemplateStageId: detailSelectedWorkbook.template.stages.some((stage) => stage.id === prev.workbookTemplateStageId)
        ? prev.workbookTemplateStageId
        : (detailSelectedWorkbook.template.stages[0]?.id ?? ""),
    }));
  }, [detailSelectedWorkbook]);

  async function refreshWorkspace(options?: { reopenDetailId?: string }) {
    await Promise.all([loadWorkspace(), loadChart(), loadWorkbookDashboard()]);

    if (mode === "guardian") {
      await Promise.all([loadWorkbookTemplates(), loadAssignedWorkbooks()]);
    }

    if (options?.reopenDetailId) {
      await loadDetail(options.reopenDetailId);
    }
  }

  async function handleCreateWorkbookTemplate() {
    setErrorMessage("");
    setMessage("");

    if (!templateDraft.title.trim() || !templateDraft.publisher.trim()) {
      setErrorMessage("문제집 이름과 출판사를 입력해주세요.");
      return;
    }

    if (!templateDraft.grade) {
      setErrorMessage("문제집 대상 학년을 선택해주세요.");
      return;
    }

    const stages = templateDraft.stages.map((stage) => stage.trim()).filter(Boolean);

    if (!stages.length) {
      setErrorMessage("문제집 단계를 하나 이상 입력해주세요.");
      return;
    }

    const response = await fetch("/api/v1/workbook-templates", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        title: templateDraft.title,
        publisher: templateDraft.publisher,
        schoolLevel: templateDraft.schoolLevel,
        grade: Number(templateDraft.grade),
        semester: Number(templateDraft.semester),
        stages: stages.map((name, index) => ({
          name,
          sortOrder: index,
        })),
      }),
    });
    const payload = (await response.json().catch(() => null)) as WorkbookTemplateItem | ApiErrorPayload | null;

    if (!response.ok) {
      setErrorMessage(toApiErrorMessage(payload, "문제집 템플릿 등록에 실패했습니다."));
      return;
    }

    setTemplateDraft((prev) => ({
      ...prev,
      title: "",
      publisher: "",
      stages: ["개념원리 이해", "핵심문제 익히기", "중단원 마무리하기", "서술형 대비문제"],
    }));
    setMessage("문제집 템플릿을 등록했습니다.");
    await Promise.all([loadWorkbookTemplates(), loadWorkbookDashboard()]);
  }

  async function handleUpdateWorkbookTemplate(template: WorkbookTemplateItem) {
    const nextTitle = window.prompt("문제집 이름을 수정하세요.", template.title);

    if (nextTitle === null) {
      return;
    }

    const nextPublisher = window.prompt("출판사를 수정하세요.", template.publisher);

    if (nextPublisher === null) {
      return;
    }

    setErrorMessage("");
    setMessage("");

    const response = await fetch(`/api/v1/workbook-templates/${template.id}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        title: nextTitle,
        publisher: nextPublisher,
      }),
    });
    const payload = (await response.json().catch(() => null)) as WorkbookTemplateItem | ApiErrorPayload | null;

    if (!response.ok) {
      setErrorMessage(toApiErrorMessage(payload, "문제집 템플릿 수정에 실패했습니다."));
      return;
    }

    setMessage("문제집 템플릿 정보를 수정했습니다.");
    await Promise.all([loadWorkbookTemplates(), loadWorkbookDashboard(), loadAssignedWorkbooks()]);
  }

  async function handleToggleWorkbookTemplateActive(template: WorkbookTemplateItem) {
    setErrorMessage("");
    setMessage("");

    const response = await fetch(`/api/v1/workbook-templates/${template.id}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        isActive: !template.isActive,
      }),
    });
    const payload = (await response.json().catch(() => null)) as WorkbookTemplateItem | ApiErrorPayload | null;

    if (!response.ok) {
      setErrorMessage(toApiErrorMessage(payload, "문제집 활성 상태 변경에 실패했습니다."));
      return;
    }

    setMessage(template.isActive ? "문제집 템플릿을 비활성화했습니다." : "문제집 템플릿을 다시 활성화했습니다.");
    await Promise.all([loadWorkbookTemplates(), loadAssignedWorkbooks(), loadWorkbookDashboard()]);
  }

  async function handleAssignWorkbookTemplate() {
    if (!selectedStudentId) {
      setErrorMessage("학생을 먼저 선택해주세요.");
      return;
    }

    if (!assignmentDraft.workbookTemplateId) {
      setErrorMessage("배정할 문제집을 선택해주세요.");
      return;
    }

    setErrorMessage("");
    setMessage("");

    const response = await fetch("/api/v1/student-workbooks", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        studentId: selectedStudentId,
        workbookTemplateId: assignmentDraft.workbookTemplateId,
      }),
    });
    const payload = (await response.json().catch(() => null)) as StudentWorkbookItem | ApiErrorPayload | null;

    if (!response.ok) {
      setErrorMessage(toApiErrorMessage(payload, "학생 문제집 배정에 실패했습니다."));
      return;
    }

    setAssignmentDraft({
      workbookTemplateId: "",
    });
    setMessage("학생에게 문제집을 배정했습니다.");
    await Promise.all([loadAssignedWorkbooks(), loadWorkbookDashboard()]);
  }

  async function handleToggleStudentWorkbookArchive(studentWorkbook: StudentWorkbookItem) {
    setErrorMessage("");
    setMessage("");

    const response = await fetch(`/api/v1/student-workbooks/${studentWorkbook.id}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        isArchived: !studentWorkbook.isArchived,
      }),
    });
    const payload = (await response.json().catch(() => null)) as StudentWorkbookItem | ApiErrorPayload | null;

    if (!response.ok) {
      setErrorMessage(toApiErrorMessage(payload, "학생 문제집 상태 변경에 실패했습니다."));
      return;
    }

    setMessage(studentWorkbook.isArchived ? "문제집 배정을 다시 활성화했습니다." : "문제집 배정을 보관했습니다.");
    await Promise.all([loadAssignedWorkbooks(), loadWorkbookDashboard()]);
  }

  async function handleWorkbookStatusCycle(row: WorkbookProgressDashboardResponse["units"][number], stageState: WorkbookProgressStageState) {
    if (!workbookDashboard?.selectedWorkbook) {
      return;
    }

    setErrorMessage("");
    setMessage("");

    const response = await fetch(mode === "student" ? "/api/v1/student/workbook-progress" : "/api/v1/workbook-progress", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        studentWorkbookId: workbookDashboard.selectedWorkbook.studentWorkbookId,
        curriculumNodeId: row.curriculumNodeId,
        workbookTemplateStageId: stageState.workbookTemplateStageId,
        status: getNextWorkbookProgressStatus(stageState.status),
      }),
    });
    const payload = (await response.json().catch(() => null)) as { row?: unknown } | ApiErrorPayload | null;

    if (!response.ok) {
      setErrorMessage(toApiErrorMessage(payload, "문제집 진도 상태 변경에 실패했습니다."));
      return;
    }

    await loadWorkbookDashboard();
  }

  async function handleStudentCreate() {
    setErrorMessage("");
    setMessage("");

    if (!uploadDraft.file) {
      setErrorMessage("사진 파일을 먼저 선택해주세요.");
      return;
    }

    if (!uploadDraft.grade) {
      setErrorMessage("대상 학년을 선택해주세요.");
      return;
    }

    if (!uploadDraft.curriculumNodeId) {
      setErrorMessage("단원을 선택해주세요.");
      return;
    }

    if (uploadDraft.studentWorkbookId && !uploadDraft.workbookTemplateStageId) {
      setErrorMessage("문제집 단계를 선택해주세요.");
      return;
    }

    const formData = new FormData();
    formData.set("file", uploadDraft.file);
    formData.set("grade", uploadDraft.grade);
    formData.set("semester", uploadDraft.semester);
    formData.set("curriculumNodeId", uploadDraft.curriculumNodeId);
    formData.set("reason", uploadDraft.reason);
    formData.set("studentMemo", uploadDraft.studentMemo);

    if (uploadDraft.studentWorkbookId) {
      formData.set("studentWorkbookId", uploadDraft.studentWorkbookId);
      formData.set("workbookTemplateStageId", uploadDraft.workbookTemplateStageId);
    }

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
      workbookTemplateStageId: prev.studentWorkbookId ? prev.workbookTemplateStageId : "",
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

    if (!detailDraft.grade) {
      setErrorMessage("대상 학년을 선택해주세요.");
      return;
    }

    if (detailDraft.studentWorkbookId && !detailDraft.workbookTemplateStageId) {
      setErrorMessage("문제집 단계를 선택해주세요.");
      return;
    }

    if (
      detailDraft.curriculumNodeId !== selectedNote.curriculum.curriculumNodeId ||
      detailDraft.semester !== String(selectedNote.curriculum.semester) ||
      detailDraft.grade !== String(selectedNote.curriculum.grade)
    ) {
      patchPayload.grade = Number(detailDraft.grade);
      patchPayload.curriculumNodeId = detailDraft.curriculumNodeId;
      patchPayload.semester = Number(detailDraft.semester);
    }

    if (detailDraft.reason !== selectedNote.reason.key) {
      patchPayload.reason = detailDraft.reason;
    }

    if (detailDraft.studentMemo !== (selectedNote.studentMemo ?? "")) {
      patchPayload.studentMemo = detailDraft.studentMemo;
    }

    if (
      detailDraft.studentWorkbookId !== (selectedNote.workbook?.studentWorkbookId ?? "") ||
      detailDraft.workbookTemplateStageId !== (selectedNote.workbook?.stageId ?? "")
    ) {
      patchPayload.studentWorkbookId = detailDraft.studentWorkbookId || null;
      patchPayload.workbookTemplateStageId = detailDraft.studentWorkbookId ? detailDraft.workbookTemplateStageId || null : null;
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
    await refreshWorkspace();
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
  const workbookBars = useMemo(
    () =>
      (workbookDashboard?.unitBars ?? []).map((bar) => ({
        key: bar.curriculumNodeId,
        label: bar.unitName,
        value: bar.completedSteps,
      })),
    [workbookDashboard?.unitBars],
  );

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
              {activeStudent ? `${activeStudent.name} · ${formatSchoolGradeLabel(activeStudent.schoolLevel, activeStudent.grade)}` : "학생 선택 필요"}
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
                    grade: "",
                    page: 1,
                    curriculumNodeId: "",
                  }));
                  setWorkbookControls({
                    grade: "",
                    studentWorkbookId: "",
                  });
                  setAssignedWorkbooks([]);
                }}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              >
                <option value="">학생 선택</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} ({formatSchoolGradeLabel(student.schoolLevel, student.grade)})
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                Promise.all([loadWorkspace(), loadChart()]).catch((error: unknown) => {
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
              <span>대상 학년</span>
              <select
                value={uploadDraft.grade}
                onChange={(event) =>
                  setUploadDraft((prev) => ({
                    ...prev,
                    grade: event.target.value,
                    curriculumNodeId: "",
                  }))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                disabled={Boolean(uploadSelectedWorkbook)}
              >
                <option value="">학년 선택</option>
                {gradeOptions.map((grade) => (
                  <option key={grade} value={String(grade)}>
                    {activeStudent ? formatSchoolGradeLabel(activeStudent.schoolLevel, grade) : `${grade}학년`}
                  </option>
                ))}
              </select>
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
                disabled={Boolean(uploadSelectedWorkbook)}
              >
                <option value="1">1학기</option>
                <option value="2">2학기</option>
              </select>
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span>문제집 선택</span>
              <select
                value={uploadDraft.studentWorkbookId}
                onChange={(event) =>
                  setUploadDraft((prev) => ({
                    ...prev,
                    studentWorkbookId: event.target.value,
                    workbookTemplateStageId: "",
                    curriculumNodeId: "",
                  }))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              >
                <option value="">문제집 연결 안 함</option>
                {workbookSelectorOptions.map((workbook) => (
                  <option key={workbook.id} value={workbook.id}>
                    {workbook.template.title} · {workbook.template.publisher} · {formatSchoolGradeLabel(workbook.template.schoolLevel, workbook.template.grade)} {workbook.template.semester}학기
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span>문제집 단계</span>
              <select
                value={uploadDraft.workbookTemplateStageId}
                onChange={(event) =>
                  setUploadDraft((prev) => ({
                    ...prev,
                    workbookTemplateStageId: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                disabled={!uploadSelectedWorkbook}
              >
                <option value="">{uploadSelectedWorkbook ? "단계 선택" : "문제집을 먼저 선택하세요"}</option>
                {(uploadSelectedWorkbook?.template.stages ?? []).map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
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
                disabled={!uploadDraft.grade || !uploadDraft.semester}
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

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs tracking-[0.24em] uppercase text-teal-700">Workbook Progress</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-950">문제집 진도</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              문제집을 선택하면 단원별 단계 진행 상태를 바로 바꾸고, 전체 완료율을 한눈에 확인할 수 있습니다.
            </p>
          </div>
          {workbookDashboard?.selectedWorkbook ? (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
              {workbookDashboard.selectedWorkbook.title} · {workbookDashboard.selectedWorkbook.publisher}
            </span>
          ) : null}
        </div>

        {mode === "guardian" ? (
          <div className="mt-5 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <article className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">문제집 템플릿 등록</h4>
                  <p className="mt-1 text-xs text-slate-500">보호자가 직접 문제집 이름, 출판사, 단계 구조를 등록합니다.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleCreateWorkbookTemplate().catch((error: unknown) => {
                      setErrorMessage(error instanceof Error ? error.message : "문제집 템플릿 등록에 실패했습니다.");
                    });
                  }}
                  className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
                >
                  템플릿 저장
                </button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-sm text-slate-700">
                  <span>문제집 이름</span>
                  <input
                    value={templateDraft.title}
                    onChange={(event) =>
                      setTemplateDraft((prev) => ({
                        ...prev,
                        title: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                    placeholder="개념원리 베이직"
                  />
                </label>
                <label className="space-y-1 text-sm text-slate-700">
                  <span>출판사</span>
                  <input
                    value={templateDraft.publisher}
                    onChange={(event) =>
                      setTemplateDraft((prev) => ({
                        ...prev,
                        publisher: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                    placeholder="개념원리"
                  />
                </label>
                <label className="space-y-1 text-sm text-slate-700">
                  <span>학교급</span>
                  <select
                    value={templateDraft.schoolLevel}
                    onChange={(event) =>
                      setTemplateDraft((prev) => ({
                        ...prev,
                        schoolLevel: event.target.value as SchoolLevel,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                  >
                    <option value="elementary">초등</option>
                    <option value="middle">중등</option>
                    <option value="high">고등</option>
                  </select>
                </label>
                <label className="space-y-1 text-sm text-slate-700">
                  <span>대상 학년</span>
                  <select
                    value={templateDraft.grade}
                    onChange={(event) =>
                      setTemplateDraft((prev) => ({
                        ...prev,
                        grade: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                  >
                    <option value="">학년 선택</option>
                    {getGradeOptionsForSchoolLevel(templateDraft.schoolLevel).map((grade) => (
                      <option key={grade} value={String(grade)}>
                        {formatSchoolGradeLabel(templateDraft.schoolLevel, grade)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm text-slate-700">
                  <span>학기</span>
                  <select
                    value={templateDraft.semester}
                    onChange={(event) =>
                      setTemplateDraft((prev) => ({
                        ...prev,
                        semester: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                  >
                    <option value="1">1학기</option>
                    <option value="2">2학기</option>
                  </select>
                </label>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">문제집 단계 구조</p>
                  <button
                    type="button"
                    onClick={() =>
                      setTemplateDraft((prev) => ({
                        ...prev,
                        stages: [...prev.stages, ""],
                      }))
                    }
                    className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                  >
                    단계 추가
                  </button>
                </div>
                {templateDraft.stages.map((stage, index) => (
                  <div key={`${index}-${stage}`} className="grid gap-2 md:grid-cols-[1fr_auto_auto_auto]">
                    <input
                      value={stage}
                      onChange={(event) =>
                        setTemplateDraft((prev) => ({
                          ...prev,
                          stages: prev.stages.map((current, currentIndex) =>
                            currentIndex === index ? event.target.value : current,
                          ),
                        }))
                      }
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                      placeholder={`단계 ${index + 1}`}
                    />
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() =>
                        setTemplateDraft((prev) => {
                          const nextStages = [...prev.stages];
                          const [current] = nextStages.splice(index, 1);
                          nextStages.splice(index - 1, 0, current);
                          return {
                            ...prev,
                            stages: nextStages,
                          };
                        })
                      }
                      className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40"
                    >
                      위로
                    </button>
                    <button
                      type="button"
                      disabled={index === templateDraft.stages.length - 1}
                      onClick={() =>
                        setTemplateDraft((prev) => {
                          const nextStages = [...prev.stages];
                          const [current] = nextStages.splice(index, 1);
                          nextStages.splice(index + 1, 0, current);
                          return {
                            ...prev,
                            stages: nextStages,
                          };
                        })
                      }
                      className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40"
                    >
                      아래로
                    </button>
                    <button
                      type="button"
                      disabled={templateDraft.stages.length <= 1}
                      onClick={() =>
                        setTemplateDraft((prev) => ({
                          ...prev,
                          stages: prev.stages.filter((_, currentIndex) => currentIndex !== index),
                        }))
                      }
                      className="rounded-xl border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-40"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-5 space-y-3">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">등록된 문제집 템플릿</h4>
                  <p className="mt-1 text-xs text-slate-500">학생 배정 여부와 상관없이 보호자 계정의 템플릿을 관리합니다.</p>
                </div>
                {guardianTemplateOptions.length ? (
                  guardianTemplateOptions.map((template) => (
                    <div key={template.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {template.title} · {template.publisher}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatSchoolGradeLabel(template.schoolLevel, template.grade)} · {template.semester}학기 · 단계 {template.stages.length}개
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateWorkbookTemplate(template).catch((error: unknown) => {
                                setErrorMessage(error instanceof Error ? error.message : "문제집 템플릿 수정에 실패했습니다.");
                              });
                            }}
                            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                          >
                            템플릿 수정
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleToggleWorkbookTemplateActive(template).catch((error: unknown) => {
                                setErrorMessage(error instanceof Error ? error.message : "문제집 활성 상태 변경에 실패했습니다.");
                              });
                            }}
                            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                          >
                            {template.isActive ? "비활성화" : "재활성화"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-600">
                    아직 등록된 문제집 템플릿이 없습니다.
                  </p>
                )}
              </div>
            </article>

            <article className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">학생 문제집 배정</h4>
                  <p className="mt-1 text-xs text-slate-500">선택한 학생에게 템플릿을 배정하고 보관 상태를 관리합니다.</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                <label className="space-y-1 text-sm text-slate-700">
                  <span>배정할 문제집</span>
                  <select
                    value={assignmentDraft.workbookTemplateId}
                    onChange={(event) =>
                      setAssignmentDraft({
                        workbookTemplateId: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                    disabled={!selectedStudentId}
                  >
                    <option value="">문제집 선택</option>
                    {guardianTemplateOptions.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.title} · {template.publisher} · {formatSchoolGradeLabel(template.schoolLevel, template.grade)} {template.semester}학기
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    handleAssignWorkbookTemplate().catch((error: unknown) => {
                      setErrorMessage(error instanceof Error ? error.message : "학생 문제집 배정에 실패했습니다.");
                    });
                  }}
                  className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
                  disabled={!selectedStudentId}
                >
                  학생에게 배정
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {assignedWorkbooks.map((studentWorkbook) => (
                  <div key={studentWorkbook.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {studentWorkbook.template.title} · {studentWorkbook.template.publisher}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatSchoolGradeLabel(studentWorkbook.template.schoolLevel, studentWorkbook.template.grade)} ·{" "}
                          {studentWorkbook.template.semester}학기 · 단계 {studentWorkbook.template.stages.length}개
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            handleToggleStudentWorkbookArchive(studentWorkbook).catch((error: unknown) => {
                              setErrorMessage(error instanceof Error ? error.message : "학생 문제집 상태 변경에 실패했습니다.");
                            });
                          }}
                          className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                        >
                          {studentWorkbook.isArchived ? "배정 복구" : "배정 보관"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {!assignedWorkbooks.length ? (
                  <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-600">
                    아직 배정된 문제집이 없습니다.
                  </p>
                ) : null}
              </div>
            </article>
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm text-slate-700">
            <span>대상 학년</span>
            <select
              value={workbookControls.grade}
              onChange={(event) =>
                setWorkbookControls((prev) => ({
                  ...prev,
                  grade: event.target.value,
                  studentWorkbookId: "",
                }))
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
              disabled={!activeStudent}
            >
              <option value="">학년 선택</option>
              {gradeOptions.map((grade) => (
                <option key={grade} value={String(grade)}>
                  {activeStudent ? formatSchoolGradeLabel(activeStudent.schoolLevel, grade) : `${grade}학년`}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>문제집</span>
            <select
              value={workbookControls.studentWorkbookId}
              onChange={(event) =>
                setWorkbookControls((prev) => ({
                  ...prev,
                  studentWorkbookId: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
              disabled={!activeStudent}
            >
              <option value="">문제집 선택</option>
              {workbookOptionsForSelectedGrade.map((workbook) => (
                <option key={workbook.id} value={workbook.id}>
                  {workbook.template.title} · {workbook.template.publisher} · {workbook.template.semester}학기
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="전체 단계 수" value={`${workbookDashboard?.summary.totalSteps ?? 0}`} description="단원 x 단계 전체 셀 수" />
          <MetricCard label="완료" value={`${workbookDashboard?.summary.completedCount ?? 0}`} description="완료 상태 셀 수" />
          <MetricCard label="진행중" value={`${workbookDashboard?.summary.inProgressCount ?? 0}`} description="진행중 상태 셀 수" />
          <MetricCard label="시작전" value={`${workbookDashboard?.summary.notStartedCount ?? 0}`} description="아직 시작하지 않은 셀 수" />
          <MetricCard label="완료율" value={`${workbookDashboard?.summary.completedPct ?? 0}%`} description="완료 단계 비율" />
        </div>

        <div className="mt-5">
          {!activeStudent && mode === "guardian" ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
              학생을 먼저 선택하면 문제집 진도 현황이 표시됩니다.
            </div>
          ) : workbookLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">문제집 진도 현황을 불러오는 중입니다.</div>
          ) : (
            <WrongNoteBarChart
              bars={workbookBars}
              maxValue={Math.max(...workbookBars.map((bar) => bar.value), 0)}
              totalCount={workbookBars.reduce((sum, bar) => sum + bar.value, 0)}
              loading={false}
              emptyMessage="선택한 문제집에 아직 표시할 진도 데이터가 없습니다"
            />
          )}
        </div>

        <div className="mt-5 overflow-x-auto rounded-[1.25rem] border border-slate-200">
          {!workbookDashboard?.selectedWorkbook ? (
            <div className="bg-slate-50 px-4 py-8 text-sm text-slate-600">선택한 조건에 맞는 문제집이 없습니다. 문제집을 등록하고 학생에게 배정해 주세요.</div>
          ) : (
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="border-b border-slate-200 px-4 py-3 text-left font-semibold text-slate-700">단원</th>
                  {workbookDashboard.selectedWorkbook.stages.map((stage) => (
                    <th key={stage.id} className="border-b border-slate-200 px-4 py-3 text-center font-semibold text-slate-700">
                      {stage.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workbookDashboard.units.map((unit) => (
                  <tr key={unit.curriculumNodeId} className="bg-white">
                    <td className="border-b border-slate-200 px-4 py-3 font-medium text-slate-900">{unit.unitName}</td>
                    {unit.stageStates.map((stageState) => (
                      <td key={`${unit.curriculumNodeId}-${stageState.workbookTemplateStageId}`} className="border-b border-slate-200 px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            handleWorkbookStatusCycle(unit, stageState).catch((error: unknown) => {
                              setErrorMessage(error instanceof Error ? error.message : "문제집 진도 상태 변경에 실패했습니다.");
                            });
                          }}
                          className={`min-w-[92px] rounded-full px-3 py-2 text-xs font-semibold ${
                            stageState.status === "completed"
                              ? "bg-emerald-100 text-emerald-800"
                              : stageState.status === "in_progress"
                                ? "bg-sky-100 text-sky-800"
                                : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {getWorkbookProgressStatusLabel(stageState.status)}
                        </button>
                        <p className="mt-1 text-[11px] text-slate-500">{formatDateLabel(stageState.lastUpdatedAt)}</p>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section aria-label="오답 현황 그래프" className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs tracking-[0.24em] uppercase text-teal-700">Bar Chart Insight</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-950">오답 현황 그래프</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              그래프 기준, 대상 학년, 학기를 바꾸면 저장된 오답 데이터가 바로 바 형태로 다시 계산됩니다.
            </p>
          </div>
          {activeStudent ? (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
              {activeStudent.name}
            </span>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="space-y-1 text-sm text-slate-700">
            <span>그래프 기준</span>
            <select
              value={chartControls.dimension}
              onChange={(event) =>
                setChartControls((prev) => ({
                  ...prev,
                  dimension: event.target.value as WrongNoteChartDimension,
                }))
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
              disabled={!activeStudent}
            >
              {WRONG_NOTE_CHART_DIMENSION_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.labelKo}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>대상 학년</span>
            <select
              value={chartControls.grade}
              onChange={(event) =>
                setChartControls((prev) => ({
                  ...prev,
                  grade: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
              disabled={!activeStudent}
            >
              <option value="">학년 선택</option>
              {gradeOptions.map((grade) => (
                <option key={grade} value={String(grade)}>
                  {activeStudent ? formatSchoolGradeLabel(activeStudent.schoolLevel, grade) : `${grade}학년`}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>학기</span>
            <select
              value={chartControls.semester}
              onChange={(event) =>
                setChartControls((prev) => ({
                  ...prev,
                  semester: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
              disabled={!activeStudent}
            >
              <option value="1">1학기</option>
              <option value="2">2학기</option>
            </select>
          </label>
        </div>

        <div className="mt-5">
          {!activeStudent && mode === "guardian" ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
              학생을 먼저 선택하면 그래프가 표시됩니다.
            </div>
          ) : (
            <WrongNoteBarChart
              bars={chartData?.bars ?? []}
              maxValue={chartData?.maxValue ?? 0}
              totalCount={chartData?.totalCount ?? 0}
              loading={chartLoading}
              emptyMessage="해당 조건의 오답 데이터가 없습니다"
            />
          )}
        </div>
      </section>

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

      <section>
        <article aria-label="오답 탐색 필터" className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">오답 탐색 필터</h3>
              <p className="mt-1 text-xs text-slate-500">학기, 단원, 오류유형, 기간, 피드백 여부로 원하는 오답만 다시 찾습니다.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setFilters({
                  grade: "",
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
              <span>대상 학년</span>
              <select
                value={filters.grade}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    grade: event.target.value,
                    curriculumNodeId: "",
                    page: 1,
                  }))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              >
                <option value="">전체 학년</option>
                {gradeOptions.map((grade) => (
                  <option key={grade} value={String(grade)}>
                    {activeStudent ? formatSchoolGradeLabel(activeStudent.schoolLevel, grade) : `${grade}학년`}
                  </option>
                ))}
              </select>
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
                disabled={!filters.grade || !filters.semester}
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
                  <WrongNoteImage
                    src={wrongNote.imagePath}
                    alt={wrongNote.curriculum.unitName}
                    className="h-full w-full object-cover"
                    variant="card"
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
                  {wrongNote.workbook ? (
                    <div className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      {wrongNote.workbook.title} · {wrongNote.workbook.publisher} · {wrongNote.workbook.stageName}
                    </div>
                  ) : null}
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
                    <WrongNoteImage
                      src={selectedNote.imagePath}
                      alt={selectedNote.curriculum.unitName}
                      className="h-auto w-full object-cover"
                      variant="detail"
                      studentCanReupload={mode === "student"}
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

                  {selectedNote.workbook ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-medium text-slate-500">연결된 문제집</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {selectedNote.workbook.title} · {selectedNote.workbook.publisher}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">단계: {selectedNote.workbook.stageName}</p>
                    </div>
                  ) : null}

                  {mode === "student" ? (
                    <>
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="space-y-1 text-sm text-slate-700">
                          <span>대상 학년</span>
                          <select
                            value={detailDraft.grade}
                            onChange={(event) =>
                              setDetailDraft((prev) => ({
                                ...prev,
                                grade: event.target.value,
                                curriculumNodeId: "",
                              }))
                            }
                            className="w-full rounded-xl border border-slate-300 px-3 py-2"
                            disabled={Boolean(detailSelectedWorkbook)}
                          >
                            <option value="">학년 선택</option>
                            {gradeOptions.map((grade) => (
                              <option key={grade} value={String(grade)}>
                                {activeStudent ? formatSchoolGradeLabel(activeStudent.schoolLevel, grade) : `${grade}학년`}
                              </option>
                            ))}
                          </select>
                        </label>
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
                            disabled={Boolean(detailSelectedWorkbook)}
                          >
                            <option value="1">1학기</option>
                            <option value="2">2학기</option>
                          </select>
                        </label>
                        <label className="space-y-1 text-sm text-slate-700">
                          <span>문제집 선택</span>
                          <select
                            value={detailDraft.studentWorkbookId}
                            onChange={(event) =>
                              setDetailDraft((prev) => ({
                                ...prev,
                                studentWorkbookId: event.target.value,
                                workbookTemplateStageId: "",
                                curriculumNodeId: "",
                              }))
                            }
                            className="w-full rounded-xl border border-slate-300 px-3 py-2"
                          >
                            <option value="">문제집 연결 안 함</option>
                            {workbookSelectorOptions.map((workbook) => (
                              <option key={workbook.id} value={workbook.id}>
                                {workbook.template.title} · {workbook.template.publisher} · {formatSchoolGradeLabel(workbook.template.schoolLevel, workbook.template.grade)} {workbook.template.semester}학기
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="space-y-1 text-sm text-slate-700">
                          <span>문제집 단계</span>
                          <select
                            value={detailDraft.workbookTemplateStageId}
                            onChange={(event) =>
                              setDetailDraft((prev) => ({
                                ...prev,
                                workbookTemplateStageId: event.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-slate-300 px-3 py-2"
                            disabled={!detailSelectedWorkbook}
                          >
                            <option value="">{detailSelectedWorkbook ? "단계 선택" : "문제집을 먼저 선택하세요"}</option>
                            {(detailSelectedWorkbook?.template.stages ?? []).map((stage) => (
                              <option key={stage.id} value={stage.id}>
                                {stage.name}
                              </option>
                            ))}
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
                            disabled={!detailDraft.grade || !detailDraft.semester}
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
                      {selectedNote.workbook ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-sm font-semibold text-slate-900">문제집 연결 정보</p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {selectedNote.workbook.title} · {selectedNote.workbook.publisher} · {selectedNote.workbook.stageName}
                          </p>
                        </div>
                      ) : null}
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
