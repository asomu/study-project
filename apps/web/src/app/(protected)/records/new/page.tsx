import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getAuthSessionFromCookies } from "@/modules/auth/session";
import { RecordEntryPanel } from "@/app/(protected)/records/new/record-entry-panel";

export default async function NewRecordPage() {
  const session = await getAuthSessionFromCookies();

  if (!session) {
    redirect("/login");
  }

  return (
    <AppShell title="학습 기록 입력" subtitle="M2 핵심 입력" userEmail={session.email}>
      <RecordEntryPanel />
    </AppShell>
  );
}
