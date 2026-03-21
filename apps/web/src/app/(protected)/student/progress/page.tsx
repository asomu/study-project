import { redirect } from "next/navigation";
import { isStudentRole } from "@/modules/auth/roles";
import { getAuthSessionFromCookies } from "@/modules/auth/session";

export default async function StudentProgressPage() {
  const session = await getAuthSessionFromCookies();

  if (!session) {
    redirect("/login");
  }

  if (!isStudentRole(session.role)) {
    redirect("/dashboard");
  }

  redirect("/student/dashboard");
}
