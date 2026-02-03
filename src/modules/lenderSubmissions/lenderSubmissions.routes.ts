import { Router } from "express";
import { requireAuth, requireCapability } from "../../middleware/auth";
import { CAPABILITIES } from "../../auth/capabilities";
import { AppError } from "../../middleware/errors";
import { safeHandler } from "../../middleware/safeHandler";
import { lenderSubmissionRateLimit } from "../../middleware/rateLimit";
import { submitLenderSubmission } from "./lenderSubmissions.service";

const router = Router();

router.post(
  "/:applicationId/submit",
  requireAuth,
  requireCapability([CAPABILITIES.LENDER_SUBMIT]),
  lenderSubmissionRateLimit(),
  safeHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError("missing_token", "Authorization token is required.", 401);
    }
    const applicationId = req.params.applicationId;
    if (!applicationId) {
      throw new AppError("missing_fields", "applicationId is required.", 400);
    }
    const submission = await submitLenderSubmission({
      applicationId,
      idempotencyKey: req.get("idempotency-key") ?? null,
      actorUserId: req.user.userId,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    res.status(submission.statusCode).json({ submission: submission.value });
  })
);

export default router;
