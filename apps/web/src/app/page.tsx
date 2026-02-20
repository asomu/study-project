import { redirect } from "next/navigation";
import { getAuthSessionFromCookies } from "@/modules/auth/session";

export default async function HomePage() {
  const session = await getAuthSessionFromCookies();

  if (session) {
    redirect("/dashboard");
  }

  redirect("/login");
}
