"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ActivateForm() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      if (password !== confirmPassword) {
        setErrorMessage("비밀번호 확인이 일치하지 않습니다.");
        return;
      }

      const response = await fetch("/api/v1/auth/student-activate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          inviteCode,
          displayName,
          loginId,
          password,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
        setErrorMessage(payload?.error?.message ?? "학생 계정 활성화에 실패했습니다.");
        return;
      }

      router.replace("/student/dashboard");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-[1.75rem] border border-slate-200 bg-white/92 p-5 shadow-sm">
      <div className="space-y-1">
        <label htmlFor="inviteCode" className="text-sm font-medium text-slate-700">
          초대코드
        </label>
        <input
          id="inviteCode"
          name="inviteCode"
          type="text"
          value={inviteCode}
          onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tracking-[0.18em] text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
          placeholder="ABCD-EFGH-IJKL"
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="displayName" className="text-sm font-medium text-slate-700">
            이름
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            required
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="loginId" className="text-sm font-medium text-slate-700">
            사용할 아이디
          </label>
          <input
            id="loginId"
            name="loginId"
            type="text"
            autoComplete="username"
            value={loginId}
            onChange={(event) => setLoginId(event.target.value.toLowerCase())}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            required
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium text-slate-700">
            비밀번호
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            required
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
            비밀번호 확인
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            required
          />
        </div>
      </div>
      {errorMessage ? <p className="text-sm font-medium text-rose-600">{errorMessage}</p> : null}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-amber-200"
      >
        {submitting ? "활성화 중..." : "학생 계정 활성화"}
      </button>
      <p className="text-sm text-slate-600">
        이미 계정을 활성화했다면{" "}
        <Link href="/login" className="font-semibold text-sky-700 hover:text-sky-800">
          로그인
        </Link>
      </p>
    </form>
  );
}
