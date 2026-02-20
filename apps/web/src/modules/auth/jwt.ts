import { jwtVerify, SignJWT } from "jose";
import { UserRole } from "@prisma/client";
import type { AuthTokenPayload } from "@/modules/auth/types";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be defined with at least 32 characters");
  }

  return new TextEncoder().encode(secret);
}

function normalizeRole(role: unknown): UserRole | null {
  if (role === UserRole.guardian || role === UserRole.admin) {
    return role;
  }

  return null;
}

export async function signAuthToken(payload: AuthTokenPayload) {
  const expiresIn = process.env.JWT_EXPIRES_IN ?? "7d";

  return new SignJWT({ role: payload.role, email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getJwtSecret());
}

export async function verifyAuthToken(token: string): Promise<AuthTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: ["HS256"],
    });

    const role = normalizeRole(payload.role);
    const sub = payload.sub;

    if (!sub || !role) {
      return null;
    }

    return {
      sub,
      role,
      email: typeof payload.email === "string" ? payload.email : undefined,
    };
  } catch {
    return null;
  }
}
