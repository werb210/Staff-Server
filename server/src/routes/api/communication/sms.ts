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

const SmsReceiveSchema = z.object({
  from: z.string().min(5),
  to: z.string().min(5).optional(),
  body: z.string().min(1),
});

/**
 * POST /api/communication/sms
 * Example: curl -X POST http://localhost:5000/api/communication/sms \
 *   -H 'Content-Type: application/json' -d '{"to":"+15551234567","body":"Hello"}'
 */
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

/**
 * POST /api/communication/sms/receive
 * Example: curl -X POST http://localhost:5000/api/communication/sms/receive \
 *   -H 'Content-Type: application/json' -d '{"from":"+15559871234","body":"Thanks!"}'
 */
router.post("/receive", (req, res) => {
  try {
    const payload = SmsReceiveSchema.parse(req.body);
    logInfo("Recording inbound SMS", payload);
    const message = twilioService.receiveSms(payload.from, payload.body, payload.to);
    res.status(201).json({ message: "OK", data: message });
  } catch (error) {
    logError("Failed to record SMS", error);
    res.status(400).json({ message: "Unable to record SMS" });
  }
});

/**
 * GET /api/communication/sms
 * Example: curl http://localhost:5000/api/communication/sms
 */
router.get("/", (_req, res) => {
  logInfo("Listing SMS messages");
  const messages = twilioService.listMessages();
  res.json({ message: "OK", data: messages });
});

/**
 * GET /api/communication/sms/threads
 * Example: curl http://localhost:5000/api/communication/sms/threads
 */
router.get("/threads", (_req, res) => {
  logInfo("Listing SMS threads");
  const threads = twilioService.listThreads();
  res.json({ message: "OK", data: threads });
});

export default router;
