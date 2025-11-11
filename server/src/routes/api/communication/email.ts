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

// Sends an email through the stubbed email service.
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

// Lists the recently sent emails.
router.get("/", (_req, res) => {
  logInfo("Listing emails");
  const messages = emailService.listEmails();
  res.json({ message: "OK", data: messages });
});

export default router;
