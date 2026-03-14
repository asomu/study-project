import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { isStudentRole } from "@/modules/auth/roles";
import { getAuthSessionFromCookies } from "@/modules/auth/session";
import { StudentProgressBoard } from "@/app/(protected)/student/progress/student-progress-board";

export default async function StudentProgressPage() {
  const session = await getAuthSessionFromCookies();

  if (!session) {
    redirect("/login");
  }

  if (!isStudentRole(session.role)) {
    redirect("/dashboard");
  }

  return (
    <AppShell title="진도와 개념" subtitle="Progress & Concepts" session={session}>
      <StudentProgressBoard />
    </AppShell>
  );
}
