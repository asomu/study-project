import { redirect } from "next/navigation";
import { LoginForm } from "@/app/(public)/login/login-form";
import { getAuthSessionFromCookies } from "@/modules/auth/session";

export default async function LoginPage() {
  const session = await getAuthSessionFromCookies();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-slate-50 to-white px-4 py-12">
      <div className="mx-auto w-full max-w-md space-y-4">
        <div className="space-y-2 text-center">
          <p className="text-sm font-semibold text-sky-700">M1 Foundation</p>
          <h1 className="text-2xl font-bold text-slate-900">중학생 수학 성취 대시보드</h1>
          <p className="text-sm text-slate-600">보호자 계정으로 로그인해서 학생 학습 기록을 관리하세요.</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
