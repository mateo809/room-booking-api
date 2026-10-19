import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";
import { authenticate } from "./middleware/authenticate.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { authRouter } from "./modules/auth/auth.router.js";
import { bookingRouter } from "./modules/bookings/booking.router.js";
import { roomRouter } from "./modules/rooms/room.router.js";

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(pinoHttp({ logger }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/health", async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/rooms", authenticate, roomRouter);
  app.use("/api/bookings", authenticate, bookingRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
