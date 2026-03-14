import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { isStudentRole } from "@/modules/auth/roles";
import { getAuthSessionFromCookies } from "@/modules/auth/session";
import { StudySessionPanel } from "@/app/(protected)/student/study/session/study-session-panel";

export default async function StudentStudySessionPage() {
  const session = await getAuthSessionFromCookies();

  if (!session) {
    redirect("/login");
  }

  if (!isStudentRole(session.role)) {
    redirect("/dashboard");
  }

  return (
    <AppShell title="학습하기" subtitle="Student Study Loop" session={session}>
      <StudySessionPanel />
    </AppShell>
  );
}
