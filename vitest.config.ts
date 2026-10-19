import { defineConfig } from "vitest/config";
import { testDatabaseUrl } from "./tests/test-database.js";

export default defineConfig({
  test: {
    globalSetup: ["tests/global-setup.ts"],
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: "integration-tests-secret-that-is-long-enough",
      PASSWORD_HASH_ROUNDS: "4",
      LOG_LEVEL: "silent",
    },
  },
});
