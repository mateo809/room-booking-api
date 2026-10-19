import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";

const server = createApp().listen(env.PORT, (error) => {
  if (error) {
    logger.fatal({ err: error }, "Failed to start the server");
    process.exit(1);
  }

  logger.info(`Room booking API listening on port ${env.PORT}`);
});

const shutdown = (signal: NodeJS.Signals) => {
  logger.info({ signal }, "Shutting down");

  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
