import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getAuthSessionFromCookies } from "@/modules/auth/session";

export default async function DashboardPage() {
  const session = await getAuthSessionFromCookies();

  if (!session) {
    redirect("/login");
  }

  return (
    <AppShell title="보호자 대시보드" subtitle="학습 성취 관리" userEmail={session.email}>
      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">M1 상태</h2>
          <p className="mt-2 text-sm text-slate-600">인증, 학생 API, Prisma 스키마, 기본 레이아웃이 연결되었습니다.</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">다음 단계</h2>
          <p className="mt-2 text-sm text-slate-600">M2에서 문제집/시도/오답 입력 플로우를 확장합니다.</p>
        </article>
      </section>
    </AppShell>
  );
}
