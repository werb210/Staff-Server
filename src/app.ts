import express, { Express } from "express";
import cors from "cors";
import { requestId } from "./middleware/requestId";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler, notFoundHandler } from "./middleware/errors";
import { logWarn } from "./observability/logger";
import { registerApiRoutes as registerRoutes } from "./routes";
import twilioRouter from "./routes/twilio";


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
  const app = express();

  app.use(requestId);
  app.use(requestLogger);
  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.get("/api/ready", (_req, res) => {
    res.status(200).json({ status: "ready" });
  });

  app.get("/api/_int/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.get("/api/_int/runtime", (_req, res) => {
    res.status(200).json({ status: "runtime_ok" });
  });

  if (!process.env.TWILIO_VERIFY_SERVICE_SID) {
    logWarn("twilio_not_configured", { message: "Twilio not configured" });
  }

  app.use("/api/twilio", twilioRouter);
  registerApiRoutes(app);
  return app;
}

export { startServer } from "./server/index";
