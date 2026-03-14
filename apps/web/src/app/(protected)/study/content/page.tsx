import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { isGuardianRole } from "@/modules/auth/roles";
import { getAuthSessionFromCookies } from "@/modules/auth/session";
import { StudyContentPanel } from "@/app/(protected)/study/content/study-content-panel";

export default async function StudyContentPage() {
  const session = await getAuthSessionFromCookies();

  if (!session) {
    redirect("/login");
  }

  if (!isGuardianRole(session.role)) {
    redirect("/student/dashboard");
  }

  return (
    <AppShell title="학습 콘텐츠" subtitle="Content Authoring" session={session}>
      <StudyContentPanel />
    </AppShell>
  );
}
