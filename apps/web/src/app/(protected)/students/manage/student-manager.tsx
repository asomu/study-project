"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppShellConfig } from "@/components/layout/app-shell";

type Student = {
  id: string;
  name: string;
  schoolLevel: "elementary" | "middle" | "high";
  grade: number;
  loginUserId: string | null;
};

type InviteResult = {
  studentId: string;
  studentName: string;
  inviteCode: string;
  expiresAt: string;
};

type ApiErrorPayload = {
  error?: {
    message?: string;
  };
};

const schoolLevelOptions: Array<{ value: Student["schoolLevel"]; label: string }> = [
  { value: "elementary", label: "초등" },
  { value: "middle", label: "중등" },
  { value: "high", label: "고등" },
];

function toApiErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  return (payload as ApiErrorPayload).error?.message ?? fallback;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ko-KR");
}

export function StudentManager() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [schoolLevel, setSchoolLevel] = useState<Student["schoolLevel"]>("middle");
  const [grade, setGrade] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [inviteByStudentId, setInviteByStudentId] = useState<Record<string, InviteResult>>({});
  const [issuingStudentId, setIssuingStudentId] = useState<string | null>(null);
  const [resettingStudentId, setResettingStudentId] = useState<string | null>(null);

  async function loadStudents() {
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/v1/students");
      const payload = (await response.json().catch(() => null)) as { students?: Student[] } | ApiErrorPayload | null;

      if (!response.ok) {
        throw new Error(toApiErrorMessage(payload, "학생 목록을 불러오지 못했습니다."));
      }

      setStudents((payload as { students?: Student[] }).students ?? []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "학생 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStudents().catch(() => undefined);
  }, []);

  const sectionNav = useMemo(
    () => [
      { href: "#onboarding", label: "온보딩 개요", icon: "onboarding" as const },
      { href: "#student-create", label: "학생 생성", icon: "create" as const },
      { href: "#student-status", label: "학생 상태", icon: "status" as const },
    ],
    [],
  );

  const sidebarSummary = useMemo(
    () => (
      <section className="rounded-[1.75rem] border border-white/10 bg-white/6 p-4 text-white shadow-[0_20px_40px_rgba(2,6,23,0.22)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">Guardian Setup</p>
        <h2 className="mt-2 text-lg font-semibold">학생 연결 현황</h2>
        <p className="mt-2 text-sm leading-6 text-slate-200">
          학생 프로필 생성과 초대코드 발급을 한 흐름으로 관리합니다.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/8 p-3">
            <p className="text-[11px] font-medium text-slate-300">전체 학생</p>
            <p className="mt-1 text-xl font-semibold text-white">{students.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/8 p-3">
            <p className="text-[11px] font-medium text-slate-300">활성 연결</p>
            <p className="mt-1 text-xl font-semibold text-white">{students.filter((student) => Boolean(student.loginUserId)).length}</p>
          </div>
        </div>
      </section>
    ),
    [students],
  );

  const headerActions = useMemo(
    () => (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
          총 {students.length}명
        </span>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
          연결 완료 {students.filter((student) => Boolean(student.loginUserId)).length}명
        </span>
      </div>
    ),
    [students],
  );

  const shellConfig = useMemo(
    () => ({
      contextNav: sectionNav,
      sidebarSummary,
      headerActions,
      headerTitle: "학생 관리",
      headerSubtitle: "Guardian Setup",
    }),
    [headerActions, sectionNav, sidebarSummary],
  );

  useAppShellConfig(shellConfig);

  async function handleCreateStudent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage("");
    setMessage("");

    try {
      const response = await fetch("/api/v1/students", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name,
          schoolLevel,
          grade,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { id?: string } | ApiErrorPayload | null;

      if (!response.ok) {
        throw new Error(toApiErrorMessage(payload, "학생 생성에 실패했습니다."));
      }

      setName("");
      setSchoolLevel("middle");
      setGrade(1);
      setMessage("학생 프로필을 만들었습니다. 이제 초대코드를 발급할 수 있습니다.");
      await loadStudents();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "학생 생성에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleIssueInvite(studentId: string) {
    setIssuingStudentId(studentId);
    setErrorMessage("");
    setMessage("");

    try {
      const response = await fetch(`/api/v1/students/${studentId}/invite`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as InviteResult | ApiErrorPayload | null;

      if (!response.ok) {
        throw new Error(toApiErrorMessage(payload, "초대코드 발급에 실패했습니다."));
      }

      const invite = payload as InviteResult;

      setInviteByStudentId((current) => ({
        ...current,
        [studentId]: invite,
      }));
      setMessage(`${invite.studentName} 학생의 초대코드를 발급했습니다.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "초대코드 발급에 실패했습니다.");
    } finally {
      setIssuingStudentId(null);
    }
  }

  async function handleResetInvite(studentId: string, studentName: string) {
    if (
      !window.confirm(
        `${studentName} 학생의 현재 로그인 연결을 해제하고 새 초대코드를 발급합니다. 기존 학생 세션은 즉시 더 이상 사용할 수 없습니다.`,
      )
    ) {
      return;
    }

    setResettingStudentId(studentId);
    setErrorMessage("");
    setMessage("");

    try {
      const response = await fetch(`/api/v1/students/${studentId}/invite/reset`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as InviteResult | ApiErrorPayload | null;

      if (!response.ok) {
        throw new Error(toApiErrorMessage(payload, "학생 계정 재설정에 실패했습니다."));
      }

      const invite = payload as InviteResult;

      setInviteByStudentId((current) => ({
        ...current,
        [studentId]: invite,
      }));
      setMessage(`${invite.studentName} 학생 계정을 재설정하고 새 초대코드를 발급했습니다.`);
      await loadStudents();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "학생 계정 재설정에 실패했습니다.");
    } finally {
      setResettingStudentId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section id="onboarding" className="rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(135deg,_rgba(255,255,255,0.96),_rgba(255,247,237,0.92))] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <p className="font-mono text-xs tracking-[0.26em] text-teal-700 uppercase">Onboarding</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-950">보호자 가입 후 첫 학생을 바로 연결합니다</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          학생 프로필을 만든 뒤 초대코드를 발급하면 학생이 `/student/activate`에서 첫 로그인을 설정할 수 있습니다.
        </p>
      </section>

      <section id="student-create" className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">학생 프로필 만들기</h3>
        <form onSubmit={handleCreateStudent} className="mt-4 grid gap-3 md:grid-cols-4">
          <label className="space-y-1 text-sm text-slate-700 md:col-span-2">
            <span>학생 이름</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>학교급</span>
            <select
              value={schoolLevel}
              onChange={(event) => setSchoolLevel(event.target.value as Student["schoolLevel"])}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
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
              value={grade}
              onChange={(event) => setGrade(Number(event.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />
          </label>
          <div className="md:col-span-4">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {submitting ? "생성 중..." : "학생 프로필 생성"}
            </button>
          </div>
        </form>
      </section>

      {errorMessage ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p> : null}
      {message ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}

      <section id="student-status" className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">학생 계정 상태</h3>
          {loading ? <span className="text-sm text-slate-500">불러오는 중...</span> : null}
        </div>
        {!loading && students.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">
            아직 학생이 없습니다. 위에서 첫 학생을 추가하면 이 목록에 나타납니다.
          </div>
        ) : null}
        <div className="grid gap-3 lg:grid-cols-2">
          {students.map((student) => {
            const invite = inviteByStudentId[student.id];
            const isActive = Boolean(student.loginUserId);

            return (
              <article key={student.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900">{student.name}</h4>
                    <p className="mt-1 text-sm text-slate-500">
                      {student.schoolLevel} · {student.grade}학년
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      isActive
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border border-amber-200 bg-amber-50 text-amber-800"
                    }`}
                  >
                    {isActive ? "활성" : "미활성"}
                  </span>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-600">
                  {isActive
                    ? "학생 계정이 연결되어 있습니다. 문제가 생기면 계정을 재설정해 새 초대코드로 다시 활성화할 수 있습니다."
                    : "아직 학생 계정이 연결되지 않았습니다. 초대코드를 발급해 첫 로그인을 진행하세요."}
                </p>

                <div className="mt-4 space-y-3">
                  {!isActive ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleIssueInvite(student.id).catch(() => undefined);
                      }}
                      disabled={issuingStudentId === student.id}
                      className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-amber-200"
                    >
                      {issuingStudentId === student.id ? "발급 중..." : "초대코드 발급"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        handleResetInvite(student.id, student.name).catch(() => undefined);
                      }}
                      disabled={resettingStudentId === student.id}
                      className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-rose-200 disabled:bg-rose-50/60 disabled:text-rose-300"
                    >
                      {resettingStudentId === student.id ? "재설정 중..." : "계정 재설정 후 새 초대코드 발급"}
                    </button>
                  )}
                  {invite ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <p className="font-mono text-sm font-semibold tracking-[0.18em] text-amber-950">{invite.inviteCode}</p>
                      <p className="mt-2 text-xs text-amber-900">만료: {formatDateTime(invite.expiresAt)}</p>
                      <p className="mt-2 text-xs leading-5 text-amber-900">
                        학생에게 `/student/activate` 주소와 함께 전달하세요.
                      </p>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
