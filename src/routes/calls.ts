import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireAuthorization } from "../middleware/auth";
import { safeHandler } from "../middleware/safeHandler";
import { ROLES } from "../auth/roles";
import { AppError } from "../middleware/errors";
import { endCall, listCalls, startCall, updateCallStatus } from "../modules/calls/calls.service";
import { type CallStatus } from "../modules/calls/calls.repo";

const router = Router();

const callStartSchema = z.object({
  phoneNumber: z.string().min(1),
  direction: z.enum(["outbound", "inbound"]),
  status: z
    .enum([
      "initiated",
      "ringing",
      "in_progress",
      "connected",
      "ended",
      "failed",
      "no_answer",
      "busy",
      "completed",
      "canceled",
      "cancelled",
    ])
    .optional(),
  crmContactId: z.string().uuid().optional(),
  applicationId: z.string().uuid().optional(),
});

const callStatusSchema = z.object({
  status: z.enum([
    "initiated",
    "ringing",
    "in_progress",
    "connected",
    "ended",
    "failed",
    "no_answer",
    "busy",
    "completed",
    "canceled",
    "cancelled",
  ]),
  durationSeconds: z.number().int().nonnegative().optional().nullable(),
});

const callEndSchema = z.object({
  durationSeconds: z.number().int().nonnegative().optional().nullable(),
});

const uuidSchema = z.string().uuid();

router.post(
  "/start",
  requireAuth,
  requireAuthorization({ roles: [ROLES.ADMIN, ROLES.STAFF] }),
  safeHandler(async (req, res) => {
    const parsed = callStartSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new AppError("validation_error", "Invalid call payload.", 400);
    }

    const record = await startCall({
      phoneNumber: parsed.data.phoneNumber.trim(),
      direction: parsed.data.direction,
      status: parsed.data.status as CallStatus | undefined,
      staffUserId: req.user?.userId ?? null,
      crmContactId: parsed.data.crmContactId,
      applicationId: parsed.data.applicationId,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.status(201).json({ ok: true, call: record });
  })
);

router.post(
  "/:id/status",
  requireAuth,
  requireAuthorization({ roles: [ROLES.ADMIN, ROLES.STAFF] }),
  safeHandler(async (req, res) => {
    const id = req.params.id;
    if (!id || !uuidSchema.safeParse(id).success) {
      throw new AppError("validation_error", "Invalid call id.", 400);
    }
    const parsed = callStatusSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new AppError("validation_error", "Invalid call status payload.", 400);
    }

    const updated = await updateCallStatus({
      id,
      status: parsed.data.status,
      durationSeconds: parsed.data.durationSeconds ?? undefined,
      actorUserId: req.user?.userId ?? null,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.status(200).json({ ok: true, call: updated });
  })
);

router.post(
  "/:id/end",
  requireAuth,
  requireAuthorization({ roles: [ROLES.ADMIN, ROLES.STAFF] }),
  safeHandler(async (req, res) => {
    const id = req.params.id;
    if (!id || !uuidSchema.safeParse(id).success) {
      throw new AppError("validation_error", "Invalid call id.", 400);
    }
    const parsed = callEndSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new AppError("validation_error", "Invalid call end payload.", 400);
    }

    const updated = await endCall({
      id,
      durationSeconds: parsed.data.durationSeconds ?? undefined,
      staffUserId: req.user?.userId ?? null,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.status(200).json({ ok: true, call: updated });
  })
);

router.get(
  "/",
  requireAuth,
  requireAuthorization({ roles: [ROLES.ADMIN, ROLES.STAFF] }),
  safeHandler(async (req, res) => {
    const contactId = typeof req.query.contactId === "string" ? req.query.contactId : null;
    const applicationId =
      typeof req.query.applicationId === "string" ? req.query.applicationId : null;

    if (contactId && !uuidSchema.safeParse(contactId).success) {
      throw new AppError("validation_error", "Invalid contactId.", 400);
    }
    if (applicationId && !uuidSchema.safeParse(applicationId).success) {
      throw new AppError("validation_error", "Invalid applicationId.", 400);
    }

    const calls = await listCalls({ contactId, applicationId });
    res.status(200).json({ ok: true, calls });
  })
);

export default router;
