import type { Request, RequestHandler } from "express";
import type { Role } from "../generated/prisma/client.js";
import { forbidden, unauthorized } from "../lib/errors.js";
import { type AuthUser, verifyAccessToken } from "../modules/auth/token.js";

export const authenticate: RequestHandler = (req, _res, next) => {
  const [scheme, token] = req.headers.authorization?.split(" ") ?? [];

  if (scheme !== "Bearer" || !token) {
    throw unauthorized();
  }

  try {
    req.user = verifyAccessToken(token);
  } catch {
    throw unauthorized("The access token is invalid or has expired.");
  }

  next();
};

export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!roles.includes(currentUser(req).role)) {
      throw forbidden();
    }

    next();
  };

export const currentUser = (req: Request): AuthUser => {
  if (!req.user) {
    throw unauthorized();
  }

  return req.user;
};
