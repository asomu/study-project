import Link from "next/link";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/layout/logout-button";

type AppShellProps = {
  title: string;
  subtitle: string;
  userEmail?: string;
  children: ReactNode;
};

export function AppShell({ title, subtitle, userEmail, children }: AppShellProps) {
  const navItems = [
    { href: "/dashboard", label: "대시보드" },
    { href: "/records/new", label: "기록 입력" },
    { href: "/wrong-answers/manage", label: "오답 관리" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl items-start justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-600">{subtitle}</p>
            <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">{title}</h1>
            {userEmail ? <p className="text-xs text-slate-500">{userEmail}</p> : null}
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
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
