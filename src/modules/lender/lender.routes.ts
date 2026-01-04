import { Router } from "express";
import { requireAuth, requireCapability } from "../../middleware/auth";
import { CAPABILITIES } from "../../auth/capabilities";
import { AppError } from "../../middleware/errors";
import { getSubmissionStatus, submitApplication } from "./lender.service";

const router = Router();

router.post(
  "/submissions",
  requireAuth,
  requireCapability([CAPABILITIES.LENDER_SUBMIT]),
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError("missing_token", "Authorization token is required.", 401);
      }
      const { applicationId, idempotencyKey } = req.body ?? {};
      if (!applicationId || !idempotencyKey) {
        throw new AppError(
          "missing_fields",
          "applicationId and idempotencyKey are required.",
          400
        );
      }
      const submission = await submitApplication({
        applicationId,
        idempotencyKey,
        actorUserId: req.user.userId,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });
      res.status(201).json({ submission });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/submissions/:id",
  requireAuth,
  requireCapability([CAPABILITIES.LENDER_SUBMIT]),
  async (req, res, next) => {
    try {
      const submission = await getSubmissionStatus(req.params.id);
      res.json({ submission });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
