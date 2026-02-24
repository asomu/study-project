import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPanel } from "@/app/(protected)/dashboard/dashboard-panel";
import { getAuthSessionFromCookies } from "@/modules/auth/session";

export default async function DashboardPage() {
  const session = await getAuthSessionFromCookies();

  if (!session) {
    redirect("/login");
  }

  return (
    <AppShell title="보호자 대시보드" subtitle="M3 대시보드 MVP" userEmail={session.email}>
      <DashboardPanel />
    </AppShell>
  );
}
