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
    <AppShell title="오답 대시보드" subtitle="Guardian Wrong Note Dashboard" session={session}>
      <DashboardPanel />
    </AppShell>
  );
}
