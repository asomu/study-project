import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { isGuardianRole } from "@/modules/auth/roles";
import { getAuthSessionFromCookies } from "@/modules/auth/session";
import { StudyReviewPanel } from "@/app/(protected)/study/reviews/study-review-panel";

export default async function StudyReviewsPage() {
  const session = await getAuthSessionFromCookies();

  if (!session) {
    redirect("/login");
  }

  if (!isGuardianRole(session.role)) {
    redirect("/student/dashboard");
  }

  return (
    <AppShell title="학습 리뷰 큐" subtitle="Guardian Review Queue" session={session}>
      <StudyReviewPanel />
    </AppShell>
  );
}
