import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/modules/auth/constants";

export function proxy(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/records/:path*",
    "/wrong-answers/:path*",
    "/students/:path*",
    "/study/:path*",
    "/student/dashboard/:path*",
    "/student/progress/:path*",
    "/student/study/:path*",
    "/student/wrong-answers/:path*",
  ],
};
