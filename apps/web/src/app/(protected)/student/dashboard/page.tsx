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
    <AppShell
      title="오답노트 홈"
      subtitle="Student Wrong Note Home"
      session={session}
      primaryNav={[{ href: "/student/dashboard", label: "대시보드", icon: "dashboard", exact: true }]}
    >
      <StudentDashboardPanel />
    </AppShell>
  );
}
