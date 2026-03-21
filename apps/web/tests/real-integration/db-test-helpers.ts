import { mkdir, readdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME } from "@/modules/auth/constants";
import { signAuthToken } from "@/modules/auth/jwt";

export const SEEDED_STUDENT_ID = "11111111-1111-4111-8111-111111111111";
export const SEEDED_CURRICULUM_NODE_ID = "22222222-2222-4222-8222-222222222222";

export async function getSeedGuardian() {
  const guardianEmail = process.env.SEED_GUARDIAN_EMAIL ?? "guardian@example.com";
  const guardian = await prisma.user.findUnique({
    where: {
      email: guardianEmail,
    },
  });

  if (!guardian) {
    throw new Error(`Seed guardian not found for ${guardianEmail}. Run prisma migrate deploy and prisma:seed first.`);
  }

  return guardian;
}

export async function createSeedGuardianAuthCookie() {
  const guardian = await getSeedGuardian();
  const token = await signAuthToken({
    sub: guardian.id,
    role: guardian.role,
    email: guardian.email ?? undefined,
    loginId: guardian.loginId,
    name: guardian.name,
  });

  return `${AUTH_COOKIE_NAME}=${token}`;
}

export async function createSeedStudentAuthCookie() {
  const student = await prisma.student.findUnique({
    where: {
      id: SEEDED_STUDENT_ID,
    },
    select: {
      id: true,
      name: true,
      loginUserId: true,
    },
  });

  if (!student) {
    throw new Error(`Seed student not found for ${SEEDED_STUDENT_ID}. Run prisma migrate deploy and prisma:seed first.`);
  }

  let loginUser =
    student.loginUserId
      ? await prisma.user.findUnique({
          where: {
            id: student.loginUserId,
          },
        })
      : null;

  if (!loginUser) {
    const loginId = `seed-student-${Date.now()}`;

    loginUser = await prisma.user.create({
      data: {
        role: UserRole.student,
        loginId,
        email: null,
        name: student.name,
        isActive: true,
        passwordHash: "seed-student-password",
        credentialIdentifiers: {
          create: [
            {
              value: loginId,
            },
          ],
        },
      },
    });

    await prisma.student.update({
      where: {
        id: student.id,
      },
      data: {
        loginUserId: loginUser.id,
      },
    });
  }

  const token = await signAuthToken({
    sub: loginUser.id,
    role: loginUser.role,
    loginId: loginUser.loginId,
    name: loginUser.name,
    studentId: student.id,
  });

  return `${AUTH_COOKIE_NAME}=${token}`;
}

export async function resetSeedStudentScopedData() {
  await prisma.wrongNote.deleteMany({
    where: {
      studentId: SEEDED_STUDENT_ID,
    },
  });

  await prisma.studyReview.deleteMany({
    where: {
      studentId: SEEDED_STUDENT_ID,
    },
  });

  await prisma.studyWorkArtifact.deleteMany({
    where: {
      attempt: {
        studentId: SEEDED_STUDENT_ID,
      },
    },
  });

  await prisma.wrongAnswerCategoryMap.deleteMany({
    where: {
      wrongAnswer: {
        attemptItem: {
          attempt: {
            studentId: SEEDED_STUDENT_ID,
          },
        },
      },
    },
  });

  await prisma.wrongAnswer.deleteMany({
    where: {
      attemptItem: {
        attempt: {
          studentId: SEEDED_STUDENT_ID,
        },
      },
    },
  });

  await prisma.attemptItem.deleteMany({
    where: {
      attempt: {
        studentId: SEEDED_STUDENT_ID,
      },
    },
  });

  await prisma.attempt.deleteMany({
    where: {
      studentId: SEEDED_STUDENT_ID,
    },
  });

  await prisma.material.deleteMany({
    where: {
      studentId: SEEDED_STUDENT_ID,
    },
  });

  await prisma.studentUnitProgress.deleteMany({
    where: {
      studentId: SEEDED_STUDENT_ID,
    },
  });

  await prisma.masterySnapshot.deleteMany({
    where: {
      studentId: SEEDED_STUDENT_ID,
    },
  });
}

export async function resetSeedStudentAccountState() {
  const student = await prisma.student.findUnique({
    where: {
      id: SEEDED_STUDENT_ID,
    },
    select: {
      loginUserId: true,
    },
  });

  await prisma.studentInvite.deleteMany({
    where: {
      studentId: SEEDED_STUDENT_ID,
    },
  });

  if (!student?.loginUserId) {
    return;
  }

  await prisma.student.update({
    where: {
      id: SEEDED_STUDENT_ID,
    },
    data: {
      loginUserId: null,
    },
  });

  await prisma.userCredentialIdentifier.deleteMany({
    where: {
      userId: student.loginUserId,
    },
  });

  await prisma.user.delete({
    where: {
      id: student.loginUserId,
    },
  });
}

export async function clearTestUploadDirectory() {
  const uploadDirs = [
    resolve(process.cwd(), process.env.UPLOAD_DIR ?? "public/uploads/test-wrong-answers"),
    resolve(process.cwd(), process.env.WRONG_NOTE_UPLOAD_DIR ?? "public/uploads/test-wrong-notes"),
    resolve(process.cwd(), process.env.STUDY_UPLOAD_DIR ?? "public/uploads/test-study-work"),
  ];

  for (const uploadDir of uploadDirs) {
    await mkdir(uploadDir, { recursive: true });

    const entries = await readdir(uploadDir, { withFileTypes: true });

    await Promise.all(
      entries.map((entry) =>
        rm(resolve(uploadDir, entry.name), {
          recursive: true,
          force: true,
        }),
      ),
    );
  }
}
