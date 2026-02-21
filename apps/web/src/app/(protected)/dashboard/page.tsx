import Link from "next/link";
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
      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">기록 입력</h2>
          <p className="mt-2 text-sm text-slate-600">문제집, 시도, 문항 결과를 순서대로 입력해 학습 데이터를 적재합니다.</p>
          <Link href="/records/new" className="mt-3 inline-flex text-sm font-semibold text-sky-700 hover:text-sky-800">
            입력 화면 열기
          </Link>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">오답 관리</h2>
          <p className="mt-2 text-sm text-slate-600">오답 카테고리를 정리하고 이미지 업로드를 통해 재학습 노트를 완성합니다.</p>
          <Link
            href="/wrong-answers/manage"
            className="mt-3 inline-flex text-sm font-semibold text-sky-700 hover:text-sky-800"
          >
            오답 관리 열기
          </Link>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">M2 상태</h2>
          <p className="mt-2 text-sm text-slate-600">
            커리큘럼 조회, 문제집/시도/문항 입력, 오답 카테고리/이미지 API를 통해 핵심 입력 플로우를 검증합니다.
          </p>
        </article>
      </section>
    </AppShell>
  );
}
