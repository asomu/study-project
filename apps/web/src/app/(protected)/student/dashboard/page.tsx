import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StudentDashboardPanel } from "@/app/(protected)/student/dashboard/student-dashboard-panel";
import { isStudentRole } from "@/modules/auth/roles";
import { getAuthSessionFromCookies } from "@/modules/auth/session";

export default async function StudentDashboardPage() {
  const session = await getAuthSessionFromCookies();

  if (!session) {
    redirect("/login");
  }

  if (!isStudentRole(session.role)) {
    redirect("/dashboard");
  }

  return (
    <AppShell title="학생 대시보드" subtitle="Student Dashboard" session={session}>
      <StudentDashboardPanel />
    </AppShell>
  );
}
