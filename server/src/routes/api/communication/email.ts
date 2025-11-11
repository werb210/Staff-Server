import { Router } from "express";
import { z } from "zod";
import { emailService } from "../../../services/emailService.js";
import { logError, logInfo } from "../../../utils/logger.js";

const router = Router();

const EmailRequestSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  from: z.string().email().optional(),
});

const EmailReceiveSchema = z.object({
  from: z.string().email(),
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
});

/**
 * POST /api/communication/email
 * Example: curl -X POST http://localhost:5000/api/communication/email \
 *   -H 'Content-Type: application/json' -d '{"to":"customer@example.com","subject":"Hello","body":"Welcome"}'
 */
router.post("/", (req, res) => {
  try {
    const payload = EmailRequestSchema.parse(req.body);
    logInfo("Sending email", { to: payload.to, subject: payload.subject });
    const message = emailService.sendEmail(payload);
    res.status(201).json({ message: "OK", data: message });
  } catch (error) {
    logError("Failed to send email", error);
    res.status(400).json({ message: "Unable to send email" });
  }
});

/**
 * POST /api/communication/email/receive
 * Example: curl -X POST http://localhost:5000/api/communication/email/receive \
 *   -H 'Content-Type: application/json' -d '{"from":"customer@example.com","to":"ops@example.com","subject":"Re: Hello","body":"Thanks"}'
 */
router.post("/receive", (req, res) => {
  try {
    const payload = EmailReceiveSchema.parse(req.body);
    logInfo("Recording inbound email", { from: payload.from, subject: payload.subject });
    const message = emailService.receiveEmail(payload);
    res.status(201).json({ message: "OK", data: message });
  } catch (error) {
    logError("Failed to record email", error);
    res.status(400).json({ message: "Unable to record email" });
  }
});

/**
 * GET /api/communication/email
 * Example: curl http://localhost:5000/api/communication/email
 */
router.get("/", (_req, res) => {
  logInfo("Listing emails");
  const messages = emailService.listEmails();
  res.json({ message: "OK", data: messages });
});

/**
 * GET /api/communication/email/threads
 * Example: curl http://localhost:5000/api/communication/email/threads
 */
router.get("/threads", (_req, res) => {
  logInfo("Listing email threads");
  const threads = emailService.listThreads();
  res.json({ message: "OK", data: threads });
});

export default router;
