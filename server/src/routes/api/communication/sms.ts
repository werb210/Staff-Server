import { Router } from "express";
import { z } from "zod";

import { twilioService } from "../../../services/twilioService.js";

const router = Router();

const smsSchema = z.object({
  to: z.string().min(1),
  from: z.string().min(1),
  body: z.string().min(1)
});

router.get("/", (_req, res) => {
  res.json({ message: "OK", status: "Twilio SMS stub active" });
});

router.post("/", (req, res, next) => {
  try {
    const payload = smsSchema.parse(req.body);
    const result = twilioService.sendSms(payload);
    res.status(201).json({ message: "OK", result });
  } catch (error) {
    next(error);
  }
});

export default router;
