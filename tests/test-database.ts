import { existsSync } from "node:fs";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const url = process.env.TEST_DATABASE_URL;

if (!url) {
  throw new Error("Set TEST_DATABASE_URL to run the integration tests.");
}

export const testDatabaseUrl = url;
