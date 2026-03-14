import { redirect } from "next/navigation";
import { ActivateForm } from "@/app/(public)/student/activate/activate-form";
import { getRoleHomePath } from "@/modules/auth/roles";
import { getAuthSessionFromCookies } from "@/modules/auth/session";

export default async function StudentActivatePage() {
  const session = await getAuthSessionFromCookies();

  if (session) {
    redirect(getRoleHomePath(session.role));
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(245,158,11,0.18),_transparent_28%),linear-gradient(180deg,_#fffbeb_0%,_#f8fafc_100%)] px-4 py-12">
      <div className="mx-auto w-full max-w-xl space-y-4">
        <div className="space-y-2 text-center">
          <p className="font-mono text-xs tracking-[0.28em] text-amber-700 uppercase">Student Activation</p>
          <h1 className="text-2xl font-bold text-slate-900">학생 첫 로그인 설정</h1>
          <p className="text-sm text-slate-600">보호자가 전달한 초대코드로 아이디와 비밀번호를 처음 등록합니다.</p>
        </div>
        <ActivateForm />
      </div>
    </div>
  );
}
