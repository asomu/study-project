import { mkdir, readdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";

const prisma = new PrismaClient();
const guardianEmail = process.env.SEED_GUARDIAN_EMAIL ?? "guardian@example.com";
const guardianPassword = process.env.SEED_GUARDIAN_PASSWORD ?? "Guardian123!";
const seededStudentId = "11111111-1111-4111-8111-111111111111";
const uploadDir = resolve(process.cwd(), process.env.UPLOAD_DIR ?? "public/uploads/test-wrong-answers");
const studyUploadDir = resolve(process.cwd(), process.env.STUDY_UPLOAD_DIR ?? "public/uploads/test-study-work");

async function resetSeedStudentScopedData() {
  await prisma.studyReview.deleteMany({
    where: {
      studentId: seededStudentId,
    },
  });

  await prisma.studyWorkArtifact.deleteMany({
    where: {
      attempt: {
        studentId: seededStudentId,
      },
    },
  });

  await prisma.wrongAnswerCategoryMap.deleteMany({
    where: {
      wrongAnswer: {
        attemptItem: {
          attempt: {
            studentId: seededStudentId,
          },
        },
      },
    },
  });

  await prisma.wrongAnswer.deleteMany({
    where: {
      attemptItem: {
        attempt: {
          studentId: seededStudentId,
        },
      },
    },
  });

  await prisma.attemptItem.deleteMany({
    where: {
      attempt: {
        studentId: seededStudentId,
      },
    },
  });

  await prisma.attempt.deleteMany({
    where: {
      studentId: seededStudentId,
    },
  });

  await prisma.material.deleteMany({
    where: {
      studentId: seededStudentId,
    },
  });

  await prisma.studentUnitProgress.deleteMany({
    where: {
      studentId: seededStudentId,
    },
  });
}

async function clearTestUploadDirectory() {
  for (const directory of [uploadDir, studyUploadDir]) {
    await mkdir(directory, { recursive: true });
    const entries = await readdir(directory, { withFileTypes: true });

    await Promise.all(
      entries.map((entry) =>
        rm(resolve(directory, entry.name), {
          recursive: true,
          force: true,
        }),
      ),
    );
  }
}

test.beforeEach(async () => {
  await resetSeedStudentScopedData();
  await clearTestUploadDirectory();
});

test.afterAll(async () => {
  await resetSeedStudentScopedData();
  await clearTestUploadDirectory();
  await prisma.$disconnect();
});

test("real smoke: login -> records -> wrong-answers -> dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("이메일 또는 아이디").fill(guardianEmail);
  await page.getByLabel("비밀번호").fill(guardianPassword);
  await page.getByRole("button", { name: "로그인" }).click();

  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("heading", { name: "보호자 대시보드" })).toBeVisible();
  await page.getByLabel("학생").selectOption(seededStudentId);
  await page.getByRole("button", { name: "대시보드 갱신" }).click();
  await expect(page.getByText("아직 집계할 학습 데이터가 없습니다.")).toBeVisible();

  await page.getByRole("link", { name: "기록 입력", exact: true }).click();
  await page.waitForURL("**/records/new");
  await page.getByLabel("학생").selectOption(seededStudentId);

  await page.getByLabel("문제집 제목").fill("실브라우저 문제집");
  await page.getByLabel("출판사").fill("실브라우저 출판사");
  await page.getByRole("button", { name: "문제집 저장" }).click();
  await expect(page.getByText("문제집이 저장되었습니다.")).toBeVisible();

  await page.getByRole("button", { name: "시도 저장" }).click();
  await expect(page.getByText("시도가 저장되었습니다.")).toBeVisible();

  await page.getByLabel("문항 번호").fill("1");
  await page.getByLabel("난이도(선택)").fill("2");
  await page.getByLabel("오답 메모 (오답일 때만 저장)").fill("첫 번째 오답");
  await page.getByRole("button", { name: "문항 저장" }).click();
  await expect(page.getByText("문항과 오답이 저장되었습니다.")).toBeVisible();

  await page.getByLabel("문항 번호").fill("2");
  await page.getByLabel("난이도(선택)").fill("2");
  await page.getByLabel("오답 메모 (오답일 때만 저장)").fill("두 번째 오답");
  await page.getByRole("button", { name: "문항 저장" }).click();
  await expect(page.getByText("문항과 오답이 저장되었습니다.")).toBeVisible();

  await page.getByLabel("문항 번호").fill("3");
  await page.getByLabel("난이도(선택)").fill("3");
  await page.getByLabel("오답 메모 (오답일 때만 저장)").fill("");
  await page.getByLabel("정답 여부").check();
  await page.getByRole("button", { name: "문항 저장" }).click();
  await expect(page.getByText("정답 문항이 저장되었습니다.")).toBeVisible();

  await page.getByRole("link", { name: "오답 관리 화면으로 이동" }).click();
  await page.waitForURL("**/wrong-answers/manage");
  await page.getByLabel("학생").selectOption(seededStudentId);
  await page.getByRole("button", { name: "오답 목록 조회" }).click();
  await expect(page.getByText("선택 학생: 기본 학생")).toBeVisible();
  await expect(page.getByText("오답 2건을 불러왔습니다.")).toBeVisible();

  const firstWrongAnswerCard = page.locator("article").first();

  await page.getByLabel("문제 잘못 읽음 (misread_question)").first().check();
  await page.getByRole("button", { name: "카테고리 저장" }).first().click();
  await expect(page.getByText("카테고리가 저장되었습니다.")).toBeVisible();
  await expect(firstWrongAnswerCard.getByText("현재 카테고리:")).toContainText("misread_question");

  await firstWrongAnswerCard.locator('input[type="file"]').setInputFiles({
    name: "real-wrong-answer.png",
    mimeType: "image/png",
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
  });
  await firstWrongAnswerCard.locator("button", { hasText: "이미지 업로드" }).click();
  await expect(page.getByText("이미지가 업로드되었습니다.")).toBeVisible();

  await page.getByRole("link", { name: "보호자 대시보드" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByLabel("학생").selectOption(seededStudentId);
  await page.getByRole("button", { name: "대시보드 갱신" }).click();

  await expect(page.getByText("총 시도 1회 / 총 문항 3개")).toBeVisible();
  await expect(page.getByText("누적 오답 수")).toBeVisible();
  await expect(page.getByText("2건")).toBeVisible();
  await expect(page.getByText("소인수분해")).toBeVisible();
  await expect(page.getByText("문제 잘못 읽음")).toBeVisible();
  await expect(page.getByText(/진도 단원:\s*1\s*\/\s*\d+/)).toBeVisible();
});
