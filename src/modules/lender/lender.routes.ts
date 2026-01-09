import { Router, Request, Response, NextFunction } from "express";
import { requireAuth, requireCapability } from "../../middleware/auth";
import { CAPABILITIES } from "../../auth/capabilities";
import { AppError } from "../../middleware/errors";
import { getSubmissionStatus, submitApplication } from "./lender.service";
import { lenderSubmissionRateLimit } from "../../middleware/rateLimit";

const router = Router();

router.post(
  "/submissions",
  requireAuth,
  requireCapability([CAPABILITIES.LENDER_SUBMIT]),
  lenderSubmissionRateLimit(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError("missing_token", "Authorization token is required.", 401);
      }
      const { applicationId, idempotencyKey, lenderId } = req.body ?? {};
      if (!applicationId) {
        throw new AppError("missing_fields", "applicationId is required.", 400);
      }
      const submission = await submitApplication({
        applicationId,
        idempotencyKey: idempotencyKey ?? null,
        lenderId: lenderId ?? "default",
        actorUserId: req.user.userId,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });
      res.status(submission.statusCode).json({ submission: submission.value });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/submissions/:id",
  requireAuth,
  requireCapability([CAPABILITIES.LENDER_SUBMIT]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const submission = await getSubmissionStatus(req.params.id);
      res.json({ submission });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
