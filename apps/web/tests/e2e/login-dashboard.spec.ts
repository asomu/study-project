import { SignJWT } from "jose";
import { expect, test } from "@playwright/test";

const guardianEmail = process.env.SEED_GUARDIAN_EMAIL ?? "guardian@example.com";
const guardianPassword = process.env.SEED_GUARDIAN_PASSWORD ?? "Guardian123!";
const jwtSecret = process.env.JWT_SECRET ?? "dev_secret_32_characters_minimum_123";

async function createAuthToken() {
  return new SignJWT({
    role: "guardian",
    email: guardianEmail,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("guardian-e2e")
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(jwtSecret));
}

test("login to dashboard flow", async ({ page }) => {
  const token = await createAuthToken();

  await page.route("**/api/v1/auth/login", async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        "content-type": "application/json",
        "set-cookie": `study_auth_token=${token}; Path=/; HttpOnly; SameSite=Lax`,
      },
      body: JSON.stringify({
        accessToken: token,
        user: {
          id: "guardian-e2e",
          role: "guardian",
          email: guardianEmail,
        },
      }),
    });
  });

  await page.goto("/login");

  await page.getByLabel("이메일").fill(guardianEmail);
  await page.getByLabel("비밀번호").fill(guardianPassword);
  await page.getByRole("button", { name: "로그인" }).click();

  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("heading", { name: "보호자 대시보드" })).toBeVisible();
});
