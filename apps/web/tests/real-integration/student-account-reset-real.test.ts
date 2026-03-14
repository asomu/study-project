import { UserRole } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetStudentInvite } from "@/modules/students/invite-service";
import { SEEDED_STUDENT_ID, getSeedGuardian, resetSeedStudentAccountState } from "./db-test-helpers";

describe("real integration: student account reset", () => {
  let guardianUserId = "";

  beforeAll(async () => {
    const guardian = await getSeedGuardian();
    guardianUserId = guardian.id;
  });

  beforeEach(async () => {
    await resetSeedStudentAccountState();
  });

  afterAll(async () => {
    await resetSeedStudentAccountState();
    await prisma.$disconnect();
  });

  it("deactivates the linked student login and issues a fresh invite", async () => {
    const studentLoginUser = await prisma.user.create({
      data: {
        role: UserRole.student,
        loginId: "student-reset",
        email: null,
        name: "학생 Reset",
        isActive: true,
        passwordHash: "hashed-password",
        credentialIdentifiers: {
          create: [
            {
              value: "student-reset",
            },
          ],
        },
      },
    });

    await prisma.student.update({
      where: {
        id: SEEDED_STUDENT_ID,
      },
      data: {
        loginUserId: studentLoginUser.id,
      },
    });

    const result = await resetStudentInvite({
      studentId: SEEDED_STUDENT_ID,
      guardianUserId,
    });

    const [student, retiredUser, identifierCount, activeInvite] = await Promise.all([
      prisma.student.findUnique({
        where: {
          id: SEEDED_STUDENT_ID,
        },
      }),
      prisma.user.findUnique({
        where: {
          id: studentLoginUser.id,
        },
      }),
      prisma.userCredentialIdentifier.count({
        where: {
          userId: studentLoginUser.id,
        },
      }),
      prisma.studentInvite.findFirst({
        where: {
          studentId: SEEDED_STUDENT_ID,
          usedAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    expect(result.student.id).toBe(SEEDED_STUDENT_ID);
    expect(result.inviteCode).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/);
    expect(student?.loginUserId).toBeNull();
    expect(retiredUser?.isActive).toBe(false);
    expect(retiredUser?.loginId).toBe(`inactive:${studentLoginUser.id}`);
    expect(identifierCount).toBe(0);
    expect(activeInvite?.codeHash).toBeTruthy();
    expect(activeInvite?.usedAt).toBeNull();
  });
});
