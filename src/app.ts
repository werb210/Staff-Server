import express from "express";
import { corsMiddleware } from "./middleware/cors";
import authRouter from "./routes/auth";
import routes from "./routes";
import { registerApiRouteMounts } from "./routes/routeRegistry";
import { coreMiddleware } from "./middleware/core";

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(coreMiddleware);

  // secure CORS (allowlist)
  app.use(corsMiddleware);

  // auth routes (OTP, JWT, Twilio)
  app.use("/api/auth", authRouter);

  // primary API routes
  app.use("/api/v1", routes);

  // dynamic route registry (contracts)
  registerApiRouteMounts(app);

  return app;
}

export function resetOtpStateForTests() {
  // No module-scope OTP state is used by this app.
}

export const buildApp = createApp;
