import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";

import authRoutes from "../modules/auth/auth.routes";
import telephonyRoutes from "../routes/telephony.routes";
import { send } from "../utils/contractResponse";

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
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
    : ["*"];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error("CORS blocked"), false);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      optionsSuccessStatus: 200,
    }),
  );

  app.options(/.*/, cors());
  app.use(express.json());

  app.get("/health", (_req: Request, res: Response) => send.ok(res));

  app.use("/auth", authRoutes);
  app.use("/telephony", telephonyRoutes);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err?.type === "validation") {
      return send.error(res, 400, "invalid_payload");
    }

    console.error(err);
    return send.error(res, 500, "internal_error");
  });

  app.use((_req: Request, res: Response) => {
    return send.error(res, 404, "not_found");
  });

  return app;
}
