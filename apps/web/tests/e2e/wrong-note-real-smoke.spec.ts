import { Buffer } from "node:buffer";
import { mkdir, readdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";
import { expect, test, type Page } from "@playwright/test";

const prisma = new PrismaClient();
const guardianEmail = process.env.SEED_GUARDIAN_EMAIL ?? "guardian@example.com";
const guardianPassword = process.env.SEED_GUARDIAN_PASSWORD ?? "Guardian123!";
const seededStudentId = "11111111-1111-4111-8111-111111111111";
const seededCurriculumNodeId = "33333333-3333-4333-8333-333333333333";
const appDataRoot = resolve(process.cwd(), process.env.APP_DATA_ROOT ?? ".tmp/test-data");
const wrongNoteStorageRoot = resolve(appDataRoot, "wrong-notes");
const studentPassword = "Student123!";

async function clearWrongNoteUploadDirectory() {
  await mkdir(wrongNoteStorageRoot, { recursive: true });
  const entries = await readdir(wrongNoteStorageRoot, { withFileTypes: true });

  await Promise.all(
    entries.map((entry) =>
      rm(resolve(wrongNoteStorageRoot, entry.name), {
        recursive: true,
        force: true,
      }),
    ),
  );
}

async function resetSeedWrongNotes() {
  await prisma.wrongNote.deleteMany({
    where: {
      studentId: seededStudentId,
    },
  });
}

async function ensureSeedStudentLogin() {
  const passwordHash = await bcrypt.hash(studentPassword, 12);
  const student = await prisma.student.findUnique({
    where: {
      id: seededStudentId,
    },
    select: {
      id: true,
      name: true,
      loginUserId: true,
    },
  });

  if (!student) {
    throw new Error("Seed student not found.");
  }

  if (student.loginUserId) {
    const loginUser = await prisma.user.findUnique({
      where: {
        id: student.loginUserId,
      },
    });

    if (loginUser) {
      await prisma.user.update({
        where: {
          id: loginUser.id,
        },
        data: {
          isActive: true,
          passwordHash,
        },
      });
      await prisma.userCredentialIdentifier.upsert({
        where: {
          value: loginUser.loginId,
        },
        update: {
          userId: loginUser.id,
        },
        create: {
          value: loginUser.loginId,
          userId: loginUser.id,
        },
      });

      return {
        ...loginUser,
        passwordHash,
      };
    }
  }

  const loginId = `real-smoke-student-${Date.now()}`;
  const loginUser = await prisma.user.create({
    data: {
      role: UserRole.student,
      loginId,
      email: null,
      name: student.name,
      isActive: true,
      passwordHash,
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

  return loginUser;
}

async function login(page: Page, identifier: string, password: string, expectedPath: string) {
  await page.goto("/login");
  await page.getByLabel("이메일 또는 아이디").fill(identifier);
  await page.getByLabel("비밀번호").fill(password);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL(`**${expectedPath}`);
}

function wrongNoteCardGrid(page: Page) {
  return page.locator("section").filter({ has: page.getByRole("heading", { name: "오답 카드" }) });
}

test.beforeEach(async () => {
  await resetSeedWrongNotes();
  await clearWrongNoteUploadDirectory();
});

test.afterAll(async () => {
  await resetSeedWrongNotes();
  await clearWrongNoteUploadDirectory();
  await prisma.$disconnect();
});

test("real smoke: student upload -> guardian feedback -> student confirm", async ({ page, context }) => {
  const studentLoginUser = await ensureSeedStudentLogin();

  await login(page, studentLoginUser.loginId, studentPassword, "/student/dashboard");
  await page.goto("/student/study/session");
  await page.waitForURL("**/student/dashboard");
  await page.getByLabel("사진 파일").setInputFiles({
    name: "wrong-note.png",
    mimeType: "image/png",
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
  });
  await page.getByLabel("학기").first().selectOption("1");
  await page.getByLabel("단원").first().selectOption(seededCurriculumNodeId);
  await page.getByLabel("학생 메모").first().fill("문장을 끝까지 읽지 않았어요.");
  await page.getByRole("button", { name: "오답노트 저장" }).click();

  await expect(page.getByText("오답노트를 저장했습니다.")).toBeVisible();
  await expect(wrongNoteCardGrid(page).getByRole("button", { name: /정수와 유리수/ }).first()).toBeVisible();
  await expect(page.locator('img[alt="정수와 유리수"]').first()).toBeVisible();

  await context.clearCookies();
  await login(page, guardianEmail, guardianPassword, "/dashboard");
  await page.goto("/records/new");
  await page.waitForURL("**/dashboard");
  await page.getByLabel("학생").selectOption(seededStudentId);
  await expect(wrongNoteCardGrid(page).getByRole("button", { name: /정수와 유리수/ }).first()).toBeVisible();
  await wrongNoteCardGrid(page).getByRole("button", { name: /정수와 유리수/ }).first().click();
  await page.getByLabel("보호자 피드백").fill("조건에 밑줄을 치고 마지막 부호를 다시 확인하자.");
  await page.getByRole("button", { name: "피드백 저장" }).click();

  await expect(page.getByText("보호자 피드백을 저장했습니다.")).toBeVisible();

  await context.clearCookies();
  await login(page, studentLoginUser.loginId, studentPassword, "/student/dashboard");
  await wrongNoteCardGrid(page).getByRole("button", { name: /정수와 유리수/ }).first().click();
  await expect(page.getByRole("button", { name: "닫기" })).toBeVisible();
  await expect(page.getByText("조건에 밑줄을 치고 마지막 부호를 다시 확인하자.")).toBeVisible();
});
