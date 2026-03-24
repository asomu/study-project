import { existsSync, readFileSync } from "node:fs";
import { defineConfig } from "@playwright/test";

function readEnvValueFromFile(key: string) {
  const envPath = ".env";

  if (!existsSync(envPath)) {
    return undefined;
  }

  const content = readFileSync(envPath, "utf8");
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = content.match(new RegExp(`^${escapedKey}=(.*)$`, "m"));

  if (!match) {
    return undefined;
  }

  return match[1]?.trim().replace(/^"|"$/g, "");
}

process.env.JWT_SECRET ??= readEnvValueFromFile("JWT_SECRET") ?? "dev_secret_32_characters_minimum_123";
process.env.JWT_EXPIRES_IN ??= readEnvValueFromFile("JWT_EXPIRES_IN") ?? "7d";

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";

export default defineConfig({
  testDir: ".",
  timeout: 45_000,
  retries: 0,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL,
    headless: true,
  },
  webServer: {
    command: "rm -rf .next-playwright && pnpm exec next dev --webpack --port 3100",
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
      NEXT_DIST_DIR: process.env.NEXT_DIST_DIR ?? ".next-playwright",
      APP_DATA_ROOT: process.env.APP_DATA_ROOT ?? ".tmp/test-data",
      APP_BACKUP_ROOT: process.env.APP_BACKUP_ROOT ?? ".tmp/test-backups",
      UPLOAD_MAX_BYTES: process.env.UPLOAD_MAX_BYTES ?? "5242880",
    },
  },
});
