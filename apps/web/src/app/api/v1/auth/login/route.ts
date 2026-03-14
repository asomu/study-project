import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { buildAuthTokenPayload, buildAuthUserResponse, resolveUserByIdentifier } from "@/modules/auth/account-service";
import { createAuthResponse } from "@/modules/auth/auth-response";
import { assertStudentLoginOwnership, OwnershipError } from "@/modules/auth/ownership-guard";
import { verifyPassword } from "@/modules/auth/password";
import { apiError } from "@/modules/shared/api-error";
import { logAuthFailure, logUnexpectedError } from "@/modules/shared/structured-log";

const loginRequestSchema = z.object({
  identifier: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional(),
  password: z.string().min(8).max(128),
}).superRefine((value, context) => {
  if (!value.identifier && !value.email) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["identifier"],
      message: "identifier or email is required",
    });
  }
});

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => null);
    const parsed = loginRequestSchema.safeParse(payload);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }

    const identifier = parsed.data.identifier ?? parsed.data.email ?? "";
    const lookup = await resolveUserByIdentifier(identifier);

    if (lookup.ambiguous) {
      logAuthFailure("ambiguous_identifier", {
        attemptedIdentifier: identifier,
      });
      return apiError(409, "CONFLICT", "같은 식별자가 다른 계정과 충돌합니다. 보호자에게 계정 재설정을 요청하세요.");
    }

    const user = lookup.user;

    if (!user) {
      logAuthFailure("invalid_credentials", {
        attemptedIdentifier: identifier,
      });
      return apiError(401, "AUTH_INVALID_CREDENTIALS", "Invalid email or password");
    }

    if (!user.isActive) {
      logAuthFailure("inactive_account", {
        attemptedIdentifier: identifier,
        userId: user.id,
      });
      return apiError(403, "AUTH_ACCOUNT_INACTIVE", "This account is inactive");
    }

    const passwordMatched = await verifyPassword(parsed.data.password, user.passwordHash);

    if (!passwordMatched) {
      logAuthFailure("invalid_credentials", {
        attemptedIdentifier: identifier,
        userId: user.id,
      });
      return apiError(401, "AUTH_INVALID_CREDENTIALS", "Invalid email or password");
    }

    let studentId: string | undefined;

    if (user.role === "student") {
      try {
        const student = await assertStudentLoginOwnership({
          loginUserId: user.id,
        });
        studentId = student.id;
      } catch (error) {
        if (error instanceof OwnershipError) {
          logAuthFailure("student_profile_not_linked", {
            attemptedIdentifier: identifier,
            userId: user.id,
          });
          return apiError(403, "AUTH_ACCOUNT_INACTIVE", "Student account is not linked to a profile");
        }

        throw error;
      }
    }

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        lastLoginAt: new Date(),
      },
    });

    return createAuthResponse({
      payload: buildAuthTokenPayload(user, studentId),
      user: buildAuthUserResponse(user, studentId),
    });
  } catch (error) {
    logUnexpectedError("auth.login.unexpected_error", error);
    return apiError(500, "INTERNAL_SERVER_ERROR", "Unexpected server error");
  }
}
