import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getAuthSessionFromCookies } from "@/modules/auth/session";
import { WrongAnswerManager } from "@/app/(protected)/wrong-answers/manage/wrong-answer-manager";
import { isGuardianRole } from "@/modules/auth/roles";

export default async function WrongAnswerManagePage() {
  const session = await getAuthSessionFromCookies();

  if (!session) {
    redirect("/login");
  }

  if (!isGuardianRole(session.role)) {
    redirect("/student/dashboard");
  }

  return (
    <AppShell title="오답 관리" subtitle="Guardian Workflow" session={session}>
      <WrongAnswerManager />
    </AppShell>
  );
}
