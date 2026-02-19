import { ENV } from "./config/env";
import { logger } from "./lib/logger";
import { startServer } from "./server/index";

process.on("unhandledRejection", (err) => {
  logger.error({ err }, "Unhandled Promise Rejection");
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught Exception");
  process.exit(1);
});

if (require.main === module && process.env.NODE_ENV !== "test") {
  logger.info("Server starting...");
  startServer()
    .then(() => {
      logger.info(`🚀 Server running on port ${ENV.PORT}`);
    })
    .catch((err) => {
      logger.fatal({ err }, "Server startup failed");
      process.exit(1);
    });
}

export * from "./server/index";
