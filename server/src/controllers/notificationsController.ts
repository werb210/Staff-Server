import type { Request, Response } from "express";
import type { Silo } from "../services/db.js";
import { notificationService } from "../services/notificationService.js";

const toSilo = (value: string): Silo => value as Silo;

export const triggerNotification = async (req: Request, res: Response) => {
  const silo = toSilo(req.params.silo);
  const payload = req.body ?? {};

  const { to, message } = payload;

  if (typeof to !== "string" || to.trim().length === 0) {
    return res.status(400).json({
      ok: false,
      error: "Recipient phone number is required",
      silo,
    });
  }

  if (typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({
      ok: false,
      error: "Message content is required",
      silo,
    });
  }

  const result = await notificationService.sendSMS(to, message);
  return res.json({ ok: true, silo, result });
};
