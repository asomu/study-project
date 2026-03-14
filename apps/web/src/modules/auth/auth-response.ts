import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/modules/auth/constants";
import { signAuthToken } from "@/modules/auth/jwt";
import type { AuthTokenPayload } from "@/modules/auth/types";

type AuthUserResponse = {
  id: string;
  role: AuthTokenPayload["role"];
  email?: string;
  loginId: string;
  name: string;
  studentId?: string;
};

type CreateAuthResponseParams = {
  payload: AuthTokenPayload;
  user: AuthUserResponse;
  status?: number;
};

export async function createAuthResponse({ payload, user, status = 200 }: CreateAuthResponseParams) {
  const accessToken = await signAuthToken(payload);
  const response = NextResponse.json(
    {
      accessToken,
      user,
    },
    { status },
  );

  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: accessToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
