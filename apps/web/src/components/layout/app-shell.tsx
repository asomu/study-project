import type { ReactNode } from "react";
import { LogoutButton } from "@/components/layout/logout-button";

type AppShellProps = {
  title: string;
  subtitle: string;
  userEmail?: string;
  children: ReactNode;
};

export function AppShell({ title, subtitle, userEmail, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <div>
            <p className="text-sm font-medium text-slate-600">{subtitle}</p>
            <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">{title}</h1>
            {userEmail ? <p className="text-xs text-slate-500">{userEmail}</p> : null}
          </div>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
