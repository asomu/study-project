import type { UserRole } from "@prisma/client";

export type AuthSession = {
  userId: string;
  role: UserRole;
  email?: string;
};

export type AuthTokenPayload = {
  sub: string;
  role: UserRole;
  email?: string;
};
