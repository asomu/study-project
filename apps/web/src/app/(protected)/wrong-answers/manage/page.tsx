import { redirect } from "next/navigation";
import { getAuthSessionFromCookies } from "@/modules/auth/session";
import { isGuardianRole } from "@/modules/auth/roles";

export default async function WrongAnswerManagePage() {
  const session = await getAuthSessionFromCookies();

  if (!session) {
    redirect("/login");
  }

  if (!isGuardianRole(session.role)) {
    redirect("/student/dashboard");
  }

  redirect("/dashboard");
}
