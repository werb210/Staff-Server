import { Router } from "express";
import requireAuth, { requireCapability } from "../../middleware/auth";
import { CAPABILITIES } from "../../auth/capabilities";
import { AppError } from "../../middleware/errors";
import { getSubmissionStatus, submitApplication } from "./lender.service";
import { lenderSubmissionRateLimit } from "../../middleware/rateLimit";
import { safeHandler } from "../../middleware/safeHandler";

const router = Router();

router.post(
  "/submissions",
  requireAuth,
  requireCapability([CAPABILITIES.LENDER_SUBMIT]),
  lenderSubmissionRateLimit(),
  safeHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError("missing_token", "Authorization token is required.", 401);
    }
    const { applicationId, lenderId } = req.body ?? {};
    if (!applicationId) {
      throw new AppError(
        "missing_fields",
        "applicationId is required.",
        400
      );
    }
    const submission = await submitApplication({
      applicationId,
      idempotencyKey: req.get("idempotency-key") ?? null,
      lenderId: lenderId ?? "default",
      actorUserId: req.user.userId,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    res.status(submission.statusCode).json({ submission: submission.value });
  })
);

router.get(
  "/submissions/:id",
  requireAuth,
  requireCapability([CAPABILITIES.LENDER_SUBMIT]),
  safeHandler(async (req, res) => {
    const submission = await getSubmissionStatus(req.params.id);
    res.json({ submission });
  })
);

export default router;
