import { redirect } from "next/navigation";
import { LoginForm } from "@/app/(public)/login/login-form";
import { getRoleHomePath } from "@/modules/auth/roles";
import { getAuthSessionFromCookies } from "@/modules/auth/session";

export default async function LoginPage() {
  const session = await getAuthSessionFromCookies();

  if (session) {
    redirect(getRoleHomePath(session.role));
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_25%),linear-gradient(180deg,_#f8fafc_0%,_#fffef9_100%)] px-4 py-12">
      <div className="mx-auto w-full max-w-md space-y-4">
        <div className="space-y-2 text-center">
          <p className="font-mono text-xs tracking-[0.28em] text-sky-700 uppercase">Shared Access</p>
          <h1 className="text-2xl font-bold text-slate-900">중학생 수학 성취 대시보드</h1>
          <p className="text-sm text-slate-600">보호자는 이메일로, 학생은 발급받은 아이디로 로그인합니다.</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
