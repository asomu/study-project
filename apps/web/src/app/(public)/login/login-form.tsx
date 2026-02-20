"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const defaultEmail = process.env.NEXT_PUBLIC_DEFAULT_LOGIN_EMAIL ?? "";
const defaultPassword = process.env.NEXT_PUBLIC_DEFAULT_LOGIN_PASSWORD ?? "";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState(defaultPassword);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;

        setErrorMessage(payload?.error?.message ?? "로그인에 실패했습니다.");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium text-slate-700">
          이메일
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          required
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium text-slate-700">
          비밀번호
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          required
        />
      </div>
      {errorMessage ? <p className="text-sm font-medium text-rose-600">{errorMessage}</p> : null}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
      >
        {submitting ? "로그인 중..." : "로그인"}
      </button>
    </form>
  );
}
