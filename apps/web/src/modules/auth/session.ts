import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/modules/auth/constants";
import { verifyAuthToken } from "@/modules/auth/jwt";
import type { AuthSession } from "@/modules/auth/types";
import { logAuthFailure } from "@/modules/shared/structured-log";

function extractCookieValue(cookieHeader: string, key: string) {
  const parts = cookieHeader.split(";");

  for (const part of parts) {
    const [rawName, ...rawValue] = part.trim().split("=");

    if (rawName === key) {
      return decodeURIComponent(rawValue.join("="));
    }
  }

  return null;
}

function toSessionPayload(payload: Awaited<ReturnType<typeof verifyAuthToken>>): AuthSession | null {
  if (!payload) {
    return null;
  }

  return {
    userId: payload.sub,
    role: payload.role,
    email: payload.email,
    loginId: payload.loginId,
    name: payload.name,
    studentId: payload.studentId,
  };
}

export async function getAuthSessionFromRequest(request: NextRequest | Request): Promise<AuthSession | null> {
  const cookieHeader = request.headers.get("cookie");

  if (!cookieHeader) {
    return null;
  }

  const token = extractCookieValue(cookieHeader, AUTH_COOKIE_NAME);

  if (!token) {
    return null;
  }

  const payload = await verifyAuthToken(token);

  if (!payload) {
    logAuthFailure("invalid_request_cookie_token", {
      path: request.url,
    });
  }

  return toSessionPayload(payload);
}

export async function getAuthSessionFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const payload = await verifyAuthToken(token);

  if (!payload) {
    logAuthFailure("invalid_cookie_store_token");
  }

  return toSessionPayload(payload);
}
