import bcrypt from "bcryptjs";
import { PrismaClient, SchoolLevel, Subject, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const guardianEmail = process.env.SEED_GUARDIAN_EMAIL ?? "guardian@example.com";
  const guardianPassword = process.env.SEED_GUARDIAN_PASSWORD ?? "Guardian123!";
  const passwordHash = await bcrypt.hash(guardianPassword, 12);

  const guardian = await prisma.user.upsert({
    where: { email: guardianEmail },
    update: {
      passwordHash,
      role: UserRole.guardian,
    },
    create: {
      email: guardianEmail,
      passwordHash,
      role: UserRole.guardian,
    },
  });

  await prisma.student.upsert({
    where: {
      id: "11111111-1111-4111-8111-111111111111",
    },
    update: {
      guardianUserId: guardian.id,
      name: "기본 학생",
      schoolLevel: SchoolLevel.middle,
      grade: 1,
    },
    create: {
      id: "11111111-1111-4111-8111-111111111111",
      guardianUserId: guardian.id,
      name: "기본 학생",
      schoolLevel: SchoolLevel.middle,
      grade: 1,
    },
  });

  const categories = [
    { key: "calculation_mistake", labelKo: "단순 연산 실수" },
    { key: "misread_question", labelKo: "문제 잘못 읽음" },
    { key: "lack_of_concept", labelKo: "문제 이해 못함" },
  ] as const;

  for (const category of categories) {
    await prisma.wrongAnswerCategory.upsert({
      where: { key: category.key },
      update: { labelKo: category.labelKo },
      create: {
        key: category.key,
        labelKo: category.labelKo,
      },
    });
  }

  await prisma.curriculumNode.upsert({
    where: { id: "22222222-2222-4222-8222-222222222222" },
    update: {
      curriculumVersion: "2026.01",
      schoolLevel: SchoolLevel.middle,
      subject: Subject.math,
      grade: 1,
      semester: 1,
      unitCode: "M1-S1-U1",
      unitName: "소인수분해",
      sortOrder: 1,
      activeFrom: new Date("2026-01-01"),
      activeTo: null,
    },
    create: {
      id: "22222222-2222-4222-8222-222222222222",
      curriculumVersion: "2026.01",
      schoolLevel: SchoolLevel.middle,
      subject: Subject.math,
      grade: 1,
      semester: 1,
      unitCode: "M1-S1-U1",
      unitName: "소인수분해",
      sortOrder: 1,
      activeFrom: new Date("2026-01-01"),
      activeTo: null,
    },
  });
}

main()
  .catch(async (error) => {
    console.error("Seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
