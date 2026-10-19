import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../../config/env.js";
import { Role } from "../../generated/prisma/client.js";

export interface AuthUser {
  id: string;
  role: Role;
}

export interface AccessToken {
  accessToken: string;
  expiresIn: number;
}

const tokenPayloadSchema = z.object({
  sub: z.uuid(),
  role: z.enum(Role),
});

export const signAccessToken = (user: AuthUser): AccessToken => ({
  accessToken: jwt.sign({ role: user.role }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: env.JWT_EXPIRES_IN_SECONDS,
    algorithm: "HS256",
  }),
  expiresIn: env.JWT_EXPIRES_IN_SECONDS,
});

export const verifyAccessToken = (token: string): AuthUser => {
  const payload = tokenPayloadSchema.parse(jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] }));
  return { id: payload.sub, role: payload.role };
};
