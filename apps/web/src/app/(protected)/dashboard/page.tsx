import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPanel } from "@/app/(protected)/dashboard/dashboard-panel";
import { isGuardianRole } from "@/modules/auth/roles";
import { getAuthSessionFromCookies } from "@/modules/auth/session";

export default async function DashboardPage() {
  const session = await getAuthSessionFromCookies();

  if (!session) {
    redirect("/login");
  }

  if (!isGuardianRole(session.role)) {
    redirect("/student/dashboard");
  }

  return (
    <AppShell
      title="오답 대시보드"
      subtitle="Guardian Wrong Note Dashboard"
      session={session}
      primaryNav={[
        { href: "/dashboard", label: "대시보드", icon: "dashboard", exact: true },
        { href: "/students/manage", label: "학생 관리", icon: "students", exact: true },
      ]}
    >
      <DashboardPanel />
    </AppShell>
  );
}
