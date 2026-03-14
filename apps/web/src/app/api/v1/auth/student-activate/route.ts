import { Prisma, UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  buildAuthTokenPayload,
  buildAuthUserResponse,
  buildCredentialIdentifierValues,
  normalizeLoginId,
  resolveUserByIdentifier,
} from "@/modules/auth/account-service";
import { createAuthResponse } from "@/modules/auth/auth-response";
import { hashPassword } from "@/modules/auth/password";
import { validateAccountPassword } from "@/modules/auth/password-policy";
import { apiError } from "@/modules/shared/api-error";
import { logInviteFailure, logUnexpectedError } from "@/modules/shared/structured-log";
import { hashInviteCode } from "@/modules/students/invite-code";

const activateStudentSchema = z.object({
  inviteCode: z.string().trim().min(6).max(64),
  loginId: z.string().trim().min(4).max(40),
  password: z.string().min(8).max(128),
  displayName: z.string().trim().min(1).max(50),
});

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => null);
    const parsed = activateStudentSchema.safeParse(payload);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.issues);
    }

    const passwordPolicy = validateAccountPassword(parsed.data.password);

    if (!passwordPolicy.valid) {
      return apiError(400, "VALIDATION_ERROR", passwordPolicy.message);
    }

    const codeHash = hashInviteCode(parsed.data.inviteCode);
    const now = new Date();
    const loginId = normalizeLoginId(parsed.data.loginId);
    const passwordHash = await hashPassword(parsed.data.password);

    const result = await prisma.$transaction(async (tx) => {
      const invite = await tx.studentInvite.findUnique({
        where: {
          codeHash,
        },
        include: {
          student: true,
        },
      });

      if (!invite) {
        logInviteFailure("invite_not_found", {
          codeHash,
        });
        return { error: apiError(404, "NOT_FOUND", "유효한 초대코드를 찾을 수 없습니다.") };
      }

      if (invite.usedAt) {
        logInviteFailure("invite_already_used", {
          studentId: invite.studentId,
          inviteId: invite.id,
        });
        return { error: apiError(409, "CONFLICT", "이미 사용된 초대코드입니다.") };
      }

      if (invite.expiresAt < now) {
        logInviteFailure("invite_expired", {
          studentId: invite.studentId,
          inviteId: invite.id,
        });
        return { error: apiError(410, "EXPIRED", "만료된 초대코드입니다.") };
      }

      if (invite.student.loginUserId) {
        logInviteFailure("student_already_activated", {
          studentId: invite.studentId,
          inviteId: invite.id,
        });
        return { error: apiError(409, "CONFLICT", "이미 활성화된 학생 계정입니다.") };
      }

      const duplicateLookup = await resolveUserByIdentifier(loginId, tx);

      if (duplicateLookup.user || duplicateLookup.ambiguous) {
        return { error: apiError(409, "CONFLICT", "이미 사용 중인 아이디입니다.") };
      }

      const user = await tx.user.create({
        data: {
          role: UserRole.student,
          loginId,
          email: null,
          name: parsed.data.displayName.trim(),
          isActive: true,
          acceptedTermsAt: now,
          lastLoginAt: now,
          passwordHash,
          credentialIdentifiers: {
            create: buildCredentialIdentifierValues({
              loginId,
            }).map((value) => ({
              value,
            })),
          },
        },
      });

      await tx.student.update({
        where: {
          id: invite.studentId,
        },
        data: {
          loginUserId: user.id,
          name: parsed.data.displayName.trim(),
        },
      });

      await tx.studentInvite.update({
        where: {
          id: invite.id,
        },
        data: {
          usedAt: now,
        },
      });

      return {
        user,
        studentId: invite.studentId,
      };
    });

    if ("error" in result) {
      return result.error;
    }

    return createAuthResponse({
      payload: buildAuthTokenPayload(result.user, result.studentId),
      user: buildAuthUserResponse(result.user, result.studentId),
      status: 201,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return apiError(409, "CONFLICT", "이미 사용 중인 아이디입니다.");
    }

    logUnexpectedError("auth.student_activate.unexpected_error", error);
    return apiError(500, "INTERNAL_SERVER_ERROR", "Unexpected server error");
  }
}
