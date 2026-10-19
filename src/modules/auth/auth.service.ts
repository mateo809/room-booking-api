import bcrypt from "bcryptjs";
import { env } from "../../config/env.js";
import type { User } from "../../generated/prisma/client.js";
import { conflict, notFound, unauthorized } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import { isUniqueConstraintViolation } from "../../lib/prisma-errors.js";
import type { LoginInput, RegisterInput } from "./auth.schemas.js";
import { signAccessToken } from "./token.js";

const duplicateEmail = () => conflict("An account with this email already exists.");

export const toUserResponse = (user: User) => ({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  role: user.role,
  createdAt: user.createdAt,
});

const toAuthResponse = (user: User) => ({
  ...signAccessToken({ id: user.id, role: user.role }),
  user: toUserResponse(user),
});

export const register = async (input: RegisterInput) => {
  const existingUser = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });

  if (existingUser) {
    throw duplicateEmail();
  }

  try {
    const user = await prisma.user.create({
      data: {
        email: input.email,
        fullName: input.fullName,
        passwordHash: await bcrypt.hash(input.password, env.PASSWORD_HASH_ROUNDS),
      },
    });

    return toAuthResponse(user);
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      throw duplicateEmail();
    }

    throw error;
  }
};

export const login = async (input: LoginInput) => {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const isPasswordValid = user !== null && (await bcrypt.compare(input.password, user.passwordHash));

  if (!user || !isPasswordValid) {
    throw unauthorized("Invalid email or password.");
  }

  return toAuthResponse(user);
};

export const getProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw notFound("The current user no longer exists.");
  }

  return toUserResponse(user);
};
