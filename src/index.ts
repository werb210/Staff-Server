import { ENV } from "./config/env";
import { logger } from "./lib/logger";
import { startServer } from "./server/index";

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled Rejection");
});

process.on("uncaughtException", (err) => {
  logger.error(err, "Uncaught Exception");
  process.exit(1);
});

if (require.main === module && process.env.NODE_ENV !== "test") {
  logger.info("Server starting...");
  startServer()
    .then(() => {
      logger.info(`🚀 Server running on port ${ENV.PORT}`);
    })
    .catch((err) => {
      logger.error(err);
      process.exit(1);
    });
}

export * from "./server/index";
