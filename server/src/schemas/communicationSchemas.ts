import { z } from "zod";

export const SmsPayloadSchema = z.object({
  to: z.string().min(5),
  message: z.string().min(1),
});

export const EmailPayloadSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
});

export const CallLogSchema = z.object({
  to: z.string().min(5),
  outcome: z.enum(["answered", "voicemail", "missed"]),
  notes: z.string().optional(),
});
