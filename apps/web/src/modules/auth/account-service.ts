import type { Prisma, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AuthTokenPayload } from "@/modules/auth/types";

type AuthUserShape = Pick<User, "id" | "role" | "email" | "loginId" | "name">;

function getClient(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeLoginId(loginId: string) {
  return loginId.trim().toLowerCase();
}

export function buildCredentialIdentifierValues({ email, loginId }: { email?: string | null; loginId: string }) {
  return Array.from(
    new Set(
      [normalizeLoginId(loginId), email ? normalizeEmail(email) : null].filter((value): value is string => Boolean(value)),
    ),
  );
}

export async function resolveUserByIdentifier(identifier: string, tx?: Prisma.TransactionClient) {
  const client = getClient(tx);
  const normalized = identifier.trim().toLowerCase();
  const identifierMatch = await client.userCredentialIdentifier.findUnique({
    where: {
      value: normalized,
    },
    include: {
      user: true,
    },
  });

  return {
    user: identifierMatch?.user ?? null,
    ambiguous: false,
  } as const;
}

export function buildAuthTokenPayload(user: AuthUserShape, studentId?: string): AuthTokenPayload {
  return {
    sub: user.id,
    role: user.role,
    email: user.email ?? undefined,
    loginId: user.loginId,
    name: user.name,
    studentId,
  };
}

export function buildAuthUserResponse(user: AuthUserShape, studentId?: string) {
  return {
    id: user.id,
    role: user.role,
    email: user.email ?? undefined,
    loginId: user.loginId,
    name: user.name,
    studentId,
  };
}
