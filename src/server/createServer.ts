import express, { type NextFunction, type Request, type Response } from "express";

import authRoutes from "../modules/auth/auth.routes";
import telephonyRoutes from "../routes/telephony.routes";

const requiredEnv = [
  "JWT_SECRET",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_VOICE_APP_SID",
] as const;

function assertRequiredEnv(): void {
  for (const key of requiredEnv) {
    if (!process.env[key]) {
      throw new Error(`Missing env: ${key}`);
    }
  }
}

export function createServer() {
  assertRequiredEnv();

  const app = express();
  const allowedOrigins = (
    process.env.CORS_ALLOWED_ORIGINS ||
    "https://portal.boreal.financial,https://staff.boreal.financial"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(express.json());

  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;

    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    next();
  });

  app.get("/health", (_req: Request, res: Response) => {
    return res.json({ ok: true });
  });

  app.use("/auth", authRoutes);
  app.use("/telephony", telephonyRoutes);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[SERVER ERROR]", err);
    return res.status(err?.status || 500).json({
      error: "internal_error",
      ...(process.env.NODE_ENV !== "production" && { message: err?.message }),
    });
  });

  app.use((_req: Request, res: Response) => {
    return res.status(404).json({
      error: "not_found",
    });
  });

  return app;
}
