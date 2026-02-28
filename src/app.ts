import express, { Express } from "express";
import cors from "cors";
import { requestId } from "./middleware/requestId";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler, notFoundHandler } from "./middleware/errors";
import { logWarn } from "./observability/logger";
import { registerApiRoutes as registerRoutes } from "./routes";

export function buildApp(): Express {
  const app = express();

  app.use(requestId);
  app.use(requestLogger);
  app.use(cors());
  app.use(express.json());

  if (!process.env.TWILIO_VERIFY_SERVICE_SID) {
    logWarn("twilio_not_configured", { message: "Twilio not configured" });
  }

  return app;
}

/**
 * Required for test contract compatibility.
 * DO NOT REMOVE.
 * Many tests call:
 *   const app = buildApp();
 *   registerApiRoutes(app);
 */
export function registerApiRoutes(app: Express): void {
  registerRoutes(app);
  app.use(notFoundHandler);
  app.use(errorHandler);
}

export function buildAppWithApiRoutes(): Express {
  const app = buildApp();
  registerApiRoutes(app);
  return app;
}
