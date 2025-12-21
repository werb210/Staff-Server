"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.voiceLogSchema = exports.chatSendSchema = exports.smsInboundSchema = exports.smsSendSchema = void 0;
const zod_1 = require("zod");
exports.smsSendSchema = zod_1.z.object({
    applicationId: zod_1.z.string().uuid().nullable(),
    to: zod_1.z.string(),
    from: zod_1.z.string().optional(),
    body: zod_1.z.string().min(1),
});
exports.smsInboundSchema = zod_1.z.object({
    From: zod_1.z.string(),
    To: zod_1.z.string(),
    Body: zod_1.z.string(),
    applicationId: zod_1.z.string().uuid().optional(),
});
exports.chatSendSchema = zod_1.z.object({
    applicationId: zod_1.z.string().uuid(),
    direction: zod_1.z.enum(["client", "staff"]),
    body: zod_1.z.string().min(1),
    issueReport: zod_1.z.boolean().optional(),
});
exports.voiceLogSchema = zod_1.z.object({
    applicationId: zod_1.z.string().uuid(),
    phoneNumber: zod_1.z.string(),
    eventType: zod_1.z.enum(["CALL_STARTED", "CALL_ENDED", "CALL_MISSED"]),
    durationSeconds: zod_1.z.number().optional(),
});
