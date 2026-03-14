import { redirect } from "next/navigation";
import { SignupForm } from "@/app/(public)/signup/signup-form";
import { getRoleHomePath } from "@/modules/auth/roles";
import { getAuthSessionFromCookies } from "@/modules/auth/session";

export default async function SignupPage() {
  const session = await getAuthSessionFromCookies();

  if (session) {
    redirect(getRoleHomePath(session.role));
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(13,148,136,0.16),_transparent_30%),linear-gradient(180deg,_#fffef9_0%,_#f8fafc_100%)] px-4 py-12">
      <div className="mx-auto w-full max-w-xl space-y-4">
        <div className="space-y-2 text-center">
          <p className="font-mono text-xs tracking-[0.28em] text-teal-700 uppercase">Guardian Signup</p>
          <h1 className="text-2xl font-bold text-slate-900">실사용 보호자 계정을 만듭니다</h1>
          <p className="text-sm text-slate-600">가입 후 바로 학생 프로필을 만들고 초대코드를 발급할 수 있습니다.</p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
