import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StudentManager } from "@/app/(protected)/students/manage/student-manager";
import { isGuardianRole } from "@/modules/auth/roles";
import { getAuthSessionFromCookies } from "@/modules/auth/session";

export default async function StudentsManagePage() {
  const session = await getAuthSessionFromCookies();

  if (!session) {
    redirect("/login");
  }

  if (!isGuardianRole(session.role)) {
    redirect("/student/dashboard");
  }

  return (
    <AppShell title="학생 관리" subtitle="Guardian Setup" session={session}>
      <StudentManager />
    </AppShell>
  );
}
