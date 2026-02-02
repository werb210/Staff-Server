import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireAuthorization } from "../middleware/auth";
import { safeHandler } from "../middleware/safeHandler";
import { ROLES } from "../auth/roles";
import { AppError } from "../middleware/errors";
import { voiceRateLimit } from "../middleware/rateLimit";
import {
  issueVoiceToken,
  startVoiceCall,
  endVoiceCall,
  controlVoiceCall,
} from "../modules/voice/voice.service";
import { listCalls } from "../modules/calls/calls.service";

const router = Router();

const voiceTokenSchema = z.object({});

const callStartSchema = z.object({
  phoneNumber: z.string().min(1),
  contactId: z.string().uuid().optional(),
  applicationId: z.string().uuid().optional(),
});

const callCreateSchema = z.object({
  to: z.string().min(1),
  contactId: z.string().uuid().optional(),
  applicationId: z.string().uuid().optional(),
});

const callEndSchema = z.object({
  callSid: z.string().min(1),
  status: z.enum(["completed", "failed", "cancelled", "canceled"]).optional(),
  durationSeconds: z.number().int().nonnegative().optional().nullable(),
});

const callControlSchema = z.object({
  callSid: z.string().min(1),
});

const uuidSchema = z.string().uuid();

const contextSchema = z
  .string()
  .min(1)
  .transform((value) => value.trim())
  .refine((value) => value.length > 0, "Invalid context")
  .optional();

function parseContext(context?: string): { contactId?: string; applicationId?: string } {
  if (!context) return {};
  const trimmed = context.trim();
  const parts = trimmed.split(":");
  if (parts.length === 2) {
    const [kind, id] = parts;
    if (kind === "contact") return { contactId: id };
    if (kind === "application") return { applicationId: id };
  }
  return { contactId: trimmed };
}

router.post(
  "/token",
  requireAuth,
  requireAuthorization({ roles: [ROLES.ADMIN, ROLES.STAFF] }),
  voiceRateLimit(),
  safeHandler(async (req, res) => {
    const parsed = voiceTokenSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new AppError("validation_error", "Invalid token request.", 400);
    }

    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError("invalid_token", "Invalid or expired token.", 401);
    }

    const token = issueVoiceToken({ userId });
    res.status(200).json({ ok: true, token });
  })
);

router.post(
  "/call",
  requireAuth,
  requireAuthorization({ roles: [ROLES.ADMIN, ROLES.STAFF] }),
  voiceRateLimit(),
  safeHandler(async (req, res) => {
    const parsed = callCreateSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new AppError("validation_error", "Invalid call payload.", 400);
    }

    const result = await startVoiceCall({
      phoneNumber: parsed.data.to,
      staffUserId: req.user?.userId ?? null,
      crmContactId: parsed.data.contactId ?? null,
      applicationId: parsed.data.applicationId ?? null,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.status(201).json({
      ok: true,
      callSid: result.callSid,
      call: result.call,
    });
  })
);

router.post(
  "/call/start",
  requireAuth,
  requireAuthorization({ roles: [ROLES.ADMIN, ROLES.STAFF] }),
  voiceRateLimit(),
  safeHandler(async (req, res) => {
    const parsed = callStartSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new AppError("validation_error", "Invalid call payload.", 400);
    }

    const result = await startVoiceCall({
      phoneNumber: parsed.data.phoneNumber,
      staffUserId: req.user?.userId ?? null,
      crmContactId: parsed.data.contactId ?? null,
      applicationId: parsed.data.applicationId ?? null,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.status(201).json({
      ok: true,
      callSid: result.callSid,
      call: result.call,
    });
  })
);

router.post(
  "/call/mute",
  requireAuth,
  requireAuthorization({ roles: [ROLES.ADMIN, ROLES.STAFF] }),
  voiceRateLimit(),
  safeHandler(async (req, res) => {
    const parsed = callControlSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new AppError("validation_error", "Invalid call control payload.", 400);
    }

    const updated = await controlVoiceCall({
      callSid: parsed.data.callSid,
      action: "mute",
      staffUserId: req.user?.userId ?? null,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.status(200).json({ ok: true, call: updated });
  })
);

router.post(
  "/call/hold",
  requireAuth,
  requireAuthorization({ roles: [ROLES.ADMIN, ROLES.STAFF] }),
  voiceRateLimit(),
  safeHandler(async (req, res) => {
    const parsed = callControlSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new AppError("validation_error", "Invalid call control payload.", 400);
    }

    const updated = await controlVoiceCall({
      callSid: parsed.data.callSid,
      action: "hold",
      staffUserId: req.user?.userId ?? null,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.status(200).json({ ok: true, call: updated });
  })
);

router.post(
  "/call/resume",
  requireAuth,
  requireAuthorization({ roles: [ROLES.ADMIN, ROLES.STAFF] }),
  voiceRateLimit(),
  safeHandler(async (req, res) => {
    const parsed = callControlSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new AppError("validation_error", "Invalid call control payload.", 400);
    }

    const updated = await controlVoiceCall({
      callSid: parsed.data.callSid,
      action: "resume",
      staffUserId: req.user?.userId ?? null,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.status(200).json({ ok: true, call: updated });
  })
);

router.post(
  "/call/hangup",
  requireAuth,
  requireAuthorization({ roles: [ROLES.ADMIN, ROLES.STAFF] }),
  voiceRateLimit(),
  safeHandler(async (req, res) => {
    const parsed = callControlSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new AppError("validation_error", "Invalid call control payload.", 400);
    }

    const updated = await controlVoiceCall({
      callSid: parsed.data.callSid,
      action: "hangup",
      staffUserId: req.user?.userId ?? null,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.status(200).json({ ok: true, call: updated });
  })
);

router.post(
  "/call/end",
  requireAuth,
  requireAuthorization({ roles: [ROLES.ADMIN, ROLES.STAFF] }),
  voiceRateLimit(),
  safeHandler(async (req, res) => {
    const parsed = callEndSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new AppError("validation_error", "Invalid call end payload.", 400);
    }

    const updated = await endVoiceCall({
      callSid: parsed.data.callSid,
      status: parsed.data.status,
      durationSeconds: parsed.data.durationSeconds ?? undefined,
      staffUserId: req.user?.userId ?? null,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.status(200).json({ ok: true, call: updated });
  })
);

router.get(
  "/calls",
  requireAuth,
  requireAuthorization({ roles: [ROLES.ADMIN, ROLES.STAFF] }),
  voiceRateLimit(),
  safeHandler(async (req, res) => {
    const contextInput =
      typeof req.query.context === "string" ? req.query.context : undefined;
    const parsedContext = contextSchema.safeParse(contextInput);
    if (!parsedContext.success) {
      throw new AppError("validation_error", "Invalid context.", 400);
    }

    const context = parseContext(parsedContext.data);
    if (context.contactId && !uuidSchema.safeParse(context.contactId).success) {
      throw new AppError("validation_error", "Invalid contactId.", 400);
    }
    if (
      context.applicationId &&
      !uuidSchema.safeParse(context.applicationId).success
    ) {
      throw new AppError("validation_error", "Invalid applicationId.", 400);
    }
    const calls = await listCalls({
      contactId: context.contactId ?? null,
      applicationId: context.applicationId ?? null,
    });
    res.status(200).json({ ok: true, calls });
  })
);

export default router;
