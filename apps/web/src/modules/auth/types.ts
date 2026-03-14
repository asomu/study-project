import type { UserRole } from "@prisma/client";

export type AuthSession = {
  userId: string;
  role: UserRole;
  email?: string;
  loginId: string;
  name: string;
  studentId?: string;
};

export type AuthTokenPayload = {
  sub: string;
  role: UserRole;
  email?: string;
  loginId: string;
  name: string;
  studentId?: string;
};
