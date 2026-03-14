import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { isStudentRole } from "@/modules/auth/roles";
import { getAuthSessionFromCookies } from "@/modules/auth/session";
import { StudentWrongAnswerManager } from "@/app/(protected)/student/wrong-answers/student-wrong-answer-manager";

export default async function StudentWrongAnswersPage() {
  const session = await getAuthSessionFromCookies();

  if (!session) {
    redirect("/login");
  }

  if (!isStudentRole(session.role)) {
    redirect("/dashboard");
  }

  return (
    <AppShell title="학생 오답노트" subtitle="Student Wrong Answers" session={session}>
      <StudentWrongAnswerManager />
    </AppShell>
  );
}
