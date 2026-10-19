import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(256));

export const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(128),
  fullName: z.string().trim().min(1).max(100),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
