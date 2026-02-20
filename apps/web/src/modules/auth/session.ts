import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/modules/auth/constants";
import { verifyAuthToken } from "@/modules/auth/jwt";
import type { AuthSession } from "@/modules/auth/types";

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

  return toSessionPayload(payload);
}

export async function getAuthSessionFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const payload = await verifyAuthToken(token);

  return toSessionPayload(payload);
}
