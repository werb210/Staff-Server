import { Router } from "express";
import { requireAuth, requireCapability } from "../../middleware/auth";
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
    const { applicationId, lenderId, lenderProductId, lender_product_id } = req.body ?? {};
    const resolvedLenderProductId =
      typeof lenderProductId === "string" ? lenderProductId : lender_product_id;
    if (!applicationId) {
      throw new AppError(
        "missing_fields",
        "applicationId is required.",
        400
      );
    }
    if (!lenderId) {
      throw new AppError("missing_fields", "lenderId is required.", 400);
    }
    if (!resolvedLenderProductId) {
      throw new AppError("missing_fields", "lenderProductId is required.", 400);
    }
    const submission = await submitApplication({
      applicationId,
      idempotencyKey: req.get("idempotency-key") ?? null,
      lenderId,
      lenderProductId: resolvedLenderProductId,
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
