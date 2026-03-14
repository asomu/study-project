import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["tests/setup-real-env.ts"],
    include: ["tests/real-integration/**/*.test.ts"],
    restoreMocks: true,
    clearMocks: true,
    maxWorkers: 1,
  },
});
