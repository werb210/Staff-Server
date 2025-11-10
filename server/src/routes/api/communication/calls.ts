import { Router } from "express";
import { z } from "zod";
import { initiateCall } from "../../../services/twilioService.js";
import { sanitizePhoneNumber, isE164PhoneNumber } from "../../../utils/phone.js";

const payloadSchema = z.object({
  to: z
    .string()
    .transform((value: string) => sanitizePhoneNumber(value))
    .refine((value: string) => isE164PhoneNumber(value), { message: "Destination must be a valid E.164 phone number" }),
  from: z
    .string()
    .transform((value: string) => sanitizePhoneNumber(value))
    .refine((value: string) => isE164PhoneNumber(value), { message: "Source must be a valid E.164 phone number" }),
  script: z.string().min(1, "script is required")
});

const router = Router();

/**
 * POST /api/communication/calls
 * Initiates a voice call using the Twilio integration.
 */
router.post("/", async (req, res) => {
  try {
    const payload = payloadSchema.parse(req.body);
    const call = await initiateCall(payload.to, payload.from, payload.script);
    res.json({ call });
  } catch (error) {
    res.status(400).json({
      message: "Failed to initiate call",
      error: (error as Error).message
    });
  }
});

export default router;
