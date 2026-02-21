import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getAuthSessionFromCookies } from "@/modules/auth/session";
import { WrongAnswerManager } from "@/app/(protected)/wrong-answers/manage/wrong-answer-manager";

export default async function WrongAnswerManagePage() {
  const session = await getAuthSessionFromCookies();

  if (!session) {
    redirect("/login");
  }

  return (
    <AppShell title="오답 관리" subtitle="M2 핵심 입력" userEmail={session.email}>
      <WrongAnswerManager />
    </AppShell>
  );
}
