import type { NextFunction, Request, Response } from "express";
import { logger } from "../server/utils/logger";

export default function envCheck(req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV === "test") {
    next();
    return;
  }

  const requiresTwilio =
    req.path.startsWith("/api/twilio") ||
    req.path.startsWith("/api/sms") ||
    req.path.startsWith("/api/voice");

  if (requiresTwilio) {
    const required = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"];
    const missing = required.filter((key) => !process.env[key]);

    if (missing.length) {
      logger.error("env_missing", { missing, route: req.path, service: "twilio" });
      res.status(503).json({ error: "Service temporarily unavailable" });
      return;
    }
  }

  next();
}
