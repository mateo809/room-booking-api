import { Router } from "express";
import { authenticate, currentUser } from "../../middleware/authenticate.js";
import { loginSchema, registerSchema } from "./auth.schemas.js";
import { getProfile, login, register } from "./auth.service.js";

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  res.status(201).json(await register(registerSchema.parse(req.body)));
});

authRouter.post("/login", async (req, res) => {
  res.json(await login(loginSchema.parse(req.body)));
});

authRouter.get("/me", authenticate, async (req, res) => {
  res.json(await getProfile(currentUser(req).id));
});
