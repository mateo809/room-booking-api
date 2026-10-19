import { existsSync } from "node:fs";
import { z } from "zod";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(3600),
  PASSWORD_HASH_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
});

export const env = envSchema.parse(process.env);
