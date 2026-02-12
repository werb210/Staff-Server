import type { NextFunction, Request, Response } from "express";

export default function envCheck(_req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV === "test") {
    next();
    return;
  }

  const required = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length) {
    console.error("ENV MISSING:", missing);
    res.status(500).json({ error: `env_missing: ${missing.join(",")}` });
    return;
  }

  next();
}
