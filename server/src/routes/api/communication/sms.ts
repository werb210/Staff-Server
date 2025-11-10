import { Router } from "express";
import { z } from "zod";
import { sendSms } from "../../../services/twilioService.js";
import { sanitizePhoneNumber, isE164PhoneNumber } from "../../../utils/phone.js";

const payloadSchema = z.object({
  to: z
    .string()
    .transform((value: string) => sanitizePhoneNumber(value))
    .refine((value: string) => isE164PhoneNumber(value), { message: "Recipient must be a valid E.164 phone number" }),
  message: z.string().min(1, "message is required")
});

const router = Router();

/**
 * POST /api/communication/sms
 * Sends an SMS notification.
 */
router.post("/", async (req, res) => {
  try {
    const payload = payloadSchema.parse(req.body);
    const message = await sendSms(payload.to, payload.message);
    res.json({ message });
  } catch (error) {
    res.status(400).json({
      message: "Failed to send SMS",
      error: (error as Error).message
    });
  }
});

export default router;
