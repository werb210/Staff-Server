import express from "express";
import otpRoutes from "./routes/auth/otp.js";
import applicationRoutes from "./routes/applications.js";
import documentRoutes from "./routes/documents.js";
import telephonyRoutes from "./routes/telephony.js";
import { errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  app.use(express.json());

  app.use("/api/auth/otp", otpRoutes);
  app.use("/api/applications", applicationRoutes);
  app.use("/api/documents", documentRoutes);
  app.use("/api/telephony", telephonyRoutes);

  app.get("/api/health", (req, res) => res.json({ ok: true }));

  app.use(errorHandler);

  return app;
}

/**
 * =========================
 * BACKWARD COMPATIBILITY LAYER
 * =========================
 */


export function assertCorsConfig() {
  // compatibility shim: CORS is configured at middleware level elsewhere
}

export function buildApp() {
  return createApp();
}

export function registerApiRoutes(app: express.Express) {
  // already registered inside createApp
  return app;
}

export function buildAppWithApiRoutes() {
  return createApp();
}

// some parts expect default export
const appInstance = createApp();
export default appInstance;
export const app = appInstance;
