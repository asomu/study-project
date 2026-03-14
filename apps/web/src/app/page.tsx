import { redirect } from "next/navigation";
import { LandingPage } from "@/app/landing-page";
import { getRoleHomePath } from "@/modules/auth/roles";
import { getAuthSessionFromCookies } from "@/modules/auth/session";

export default async function HomePage() {
  const session = await getAuthSessionFromCookies();

  if (session) {
    redirect(getRoleHomePath(session.role));
  }

  return <LandingPage />;
}
