import { existsSync } from "node:fs";
import { resolve } from "node:path";

export function loadLocalEnv() {
  const envPath = resolve(process.cwd(), ".env");

  if (existsSync(envPath)) {
    process.loadEnvFile(envPath);
  }
}
