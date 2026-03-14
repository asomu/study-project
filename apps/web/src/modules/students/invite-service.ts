import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertStudentOwnership } from "@/modules/auth/ownership-guard";
import { createInviteCode, hashInviteCode } from "@/modules/students/invite-code";

export const STUDENT_INVITE_TTL_DAYS = 7;

export class StudentInviteStateError extends Error {
  constructor(message = "Student invite request is not valid for the current account state") {
    super(message);
    this.name = "StudentInviteStateError";
  }
}

type IssueStudentInviteParams = {
  studentId: string;
  guardianUserId: string;
};

function buildRetiredStudentLoginId(userId: string) {
  return `inactive:${userId}`;
}

async function replaceStudentInvite({
  tx,
  studentId,
  guardianUserId,
  studentName,
}: {
  tx: Prisma.TransactionClient;
  studentId: string;
  guardianUserId: string;
  studentName: string;
}) {
  const inviteCode = createInviteCode();
  const now = new Date();
  const expiresAt = new Date(now);

  expiresAt.setDate(expiresAt.getDate() + STUDENT_INVITE_TTL_DAYS);

  await tx.studentInvite.updateMany({
    where: {
      studentId,
      usedAt: null,
    },
    data: {
      usedAt: now,
    },
  });

  await tx.studentInvite.create({
    data: {
      studentId,
      codeHash: hashInviteCode(inviteCode),
      expiresAt,
      createdByGuardianUserId: guardianUserId,
    },
  });

  return {
    inviteCode,
    expiresAt,
    student: {
      id: studentId,
      name: studentName,
    },
  };
}

export async function issueStudentInvite({ studentId, guardianUserId }: IssueStudentInviteParams) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const student = await assertStudentOwnership({
      studentId,
      guardianUserId,
      tx,
    });

    if (student.loginUserId) {
      throw new StudentInviteStateError("Active student accounts must be reset before issuing a new invite");
    }

    return replaceStudentInvite({
      tx,
      studentId: student.id,
      guardianUserId,
      studentName: student.name,
    });
  });
}

export async function resetStudentInvite({ studentId, guardianUserId }: IssueStudentInviteParams) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const student = await assertStudentOwnership({
      studentId,
      guardianUserId,
      tx,
    });

    if (student.loginUserId) {
      await tx.userCredentialIdentifier.deleteMany({
        where: {
          userId: student.loginUserId,
        },
      });

      await tx.user.update({
        where: {
          id: student.loginUserId,
        },
        data: {
          loginId: buildRetiredStudentLoginId(student.loginUserId),
          isActive: false,
        },
      });

      await tx.student.update({
        where: {
          id: student.id,
        },
        data: {
          loginUserId: null,
        },
      });
    }

    return replaceStudentInvite({
      tx,
      studentId: student.id,
      guardianUserId,
      studentName: student.name,
    });
  });
}
