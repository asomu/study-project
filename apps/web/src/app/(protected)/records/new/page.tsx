import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getAuthSessionFromCookies } from "@/modules/auth/session";
import { RecordEntryPanel } from "@/app/(protected)/records/new/record-entry-panel";
import { isGuardianRole } from "@/modules/auth/roles";

export default async function NewRecordPage() {
  const session = await getAuthSessionFromCookies();

  if (!session) {
    redirect("/login");
  }

  if (!isGuardianRole(session.role)) {
    redirect("/student/dashboard");
  }

  return (
    <AppShell title="학습 기록 입력" subtitle="Guardian Workflow" session={session}>
      <RecordEntryPanel />
    </AppShell>
  );
}
