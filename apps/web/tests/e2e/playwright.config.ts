import { defineConfig } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";

export default defineConfig({
  testDir: ".",
  timeout: 45_000,
  retries: 0,
  use: {
    baseURL,
    headless: true,
  },
  webServer: {
    command: "pnpm dev --port 3100",
    cwd: process.cwd(),
    url: `${baseURL}/login`,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ?? "postgresql://study:study@localhost:5432/study_project?schema=public",
      JWT_SECRET: process.env.JWT_SECRET ?? "dev_secret_32_characters_minimum_123",
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? "7d",
      APP_URL: process.env.APP_URL ?? baseURL,
      SEED_GUARDIAN_EMAIL: process.env.SEED_GUARDIAN_EMAIL ?? "guardian@example.com",
      SEED_GUARDIAN_PASSWORD: process.env.SEED_GUARDIAN_PASSWORD ?? "Guardian123!",
    },
  },
});
