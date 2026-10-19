import type { AuthUser } from "../modules/auth/token.js";

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}
