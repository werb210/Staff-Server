import { Router } from "express";
import { z } from "zod";
import { twilioService } from "../../../services/twilioService.js";
import { logError, logInfo } from "../../../utils/logger.js";

const router = Router();

const SmsRequestSchema = z.object({
  to: z.string().min(5),
  from: z.string().min(5).optional(),
  body: z.string().min(1),
});

// Sends an SMS through the stubbed Twilio service.
router.post("/", (req, res) => {
  try {
    const payload = SmsRequestSchema.parse(req.body);
    logInfo("Sending SMS", { to: payload.to });
    const message = twilioService.sendSms(payload.to, payload.body, payload.from);
    res.status(201).json({ message: "OK", data: message });
  } catch (error) {
    logError("Failed to send SMS", error);
    res.status(400).json({ message: "Unable to send SMS" });
  }
});

// Returns the messages recorded by the Twilio service.
router.get("/", (_req, res) => {
  logInfo("Listing SMS messages");
  const messages = twilioService.listMessages();
  res.json({ message: "OK", data: messages });
});

export default router;
