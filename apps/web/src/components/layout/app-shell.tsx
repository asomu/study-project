import Link from "next/link";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/layout/logout-button";
import { isGuardianRole } from "@/modules/auth/roles";
import type { AuthSession } from "@/modules/auth/types";

type AppShellProps = {
  title: string;
  subtitle: string;
  session: AuthSession;
  children: ReactNode;
};

export function AppShell({ title, subtitle, session, children }: AppShellProps) {
  const navItems = isGuardianRole(session.role)
    ? [
        { href: "/dashboard", label: "오답 대시보드" },
        { href: "/students/manage", label: "학생 관리" },
      ]
    : [{ href: "/student/dashboard", label: "오답노트 홈" }];
  const roleLabel = isGuardianRole(session.role) ? "Guardian" : "Student";
  const identity = session.email ?? session.loginId;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-slate-600">{subtitle}</p>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
                {roleLabel}
              </span>
            </div>
            <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">{title}</h1>
            <p className="text-xs text-slate-500">
              {session.name} · {identity}
            </p>
            <nav className="flex flex-wrap gap-2 text-xs font-medium text-slate-600">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 transition hover:border-sky-300 hover:text-sky-700"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="self-end sm:self-auto">
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
