import { Prisma, UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  buildAuthTokenPayload,
  buildAuthUserResponse,
  buildCredentialIdentifierValues,
  normalizeEmail,
  resolveUserByIdentifier,
} from "@/modules/auth/account-service";
import { createAuthResponse } from "@/modules/auth/auth-response";
import { hashPassword } from "@/modules/auth/password";
import { validateAccountPassword } from "@/modules/auth/password-policy";
import { apiError } from "@/modules/shared/api-error";
import { logAuthFailure, logUnexpectedError } from "@/modules/shared/structured-log";

const signupRequestSchema = z.object({
  name: z.string().trim().min(1).max(50),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  confirmPassword: z.string().min(8).max(128),
  acceptedTerms: z.literal(true),
});

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => null);
    const parsed = signupRequestSchema.safeParse(payload);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }

    if (parsed.data.password !== parsed.data.confirmPassword) {
      return apiError(400, "VALIDATION_ERROR", "비밀번호 확인이 일치하지 않습니다.");
    }

    const passwordPolicy = validateAccountPassword(parsed.data.password);

    if (!passwordPolicy.valid) {
      return apiError(400, "VALIDATION_ERROR", passwordPolicy.message);
    }

    const email = normalizeEmail(parsed.data.email);
    const identifierLookup = await resolveUserByIdentifier(email);

    if (identifierLookup.user || identifierLookup.ambiguous) {
      logAuthFailure("signup_duplicate_identifier", {
        email,
      });
      return apiError(409, "CONFLICT", "이미 사용 중인 이메일입니다.");
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const now = new Date();

    const user = await prisma.user.create({
      data: {
        role: UserRole.guardian,
        email,
        loginId: email,
        name: parsed.data.name.trim(),
        isActive: true,
        acceptedTermsAt: now,
        lastLoginAt: now,
        passwordHash,
        credentialIdentifiers: {
          create: buildCredentialIdentifierValues({
            email,
            loginId: email,
          }).map((value) => ({
            value,
          })),
        },
      },
    });

    return createAuthResponse({
      payload: buildAuthTokenPayload(user),
      user: buildAuthUserResponse(user),
      status: 201,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      logAuthFailure("signup_duplicate_identifier", {});
      return apiError(409, "CONFLICT", "이미 가입된 이메일입니다.");
    }

    logUnexpectedError("auth.signup.unexpected_error", error);
    return apiError(500, "INTERNAL_SERVER_ERROR", "Unexpected server error");
  }
}
