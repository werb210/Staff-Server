import { z } from "zod";
export const smsSendSchema = z.object({
    applicationId: z.string().uuid().nullable(),
    to: z.string(),
    from: z.string().optional(),
    body: z.string().min(1),
});
export const smsInboundSchema = z.object({
    From: z.string(),
    To: z.string(),
    Body: z.string(),
    applicationId: z.string().uuid().optional(),
});
export const chatSendSchema = z.object({
    applicationId: z.string().uuid(),
    direction: z.enum(["client", "staff"]),
    body: z.string().min(1),
    issueReport: z.boolean().optional(),
});
export const voiceLogSchema = z.object({
    applicationId: z.string().uuid(),
    phoneNumber: z.string(),
    eventType: z.enum(["CALL_STARTED", "CALL_ENDED", "CALL_MISSED"]),
    durationSeconds: z.number().optional(),
});
