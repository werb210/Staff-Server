import { Router } from "express";
import { getTransmissionStatus, retrySubmission, cancelSubmissionRetry } from "./lender.service";
import { AppError } from "../../middleware/errors";
import { requireAuth, requireCapability } from "../../middleware/auth";
import { CAPABILITIES } from "../../auth/capabilities";

const router = Router();

router.use(requireAuth);
router.use(requireCapability([CAPABILITIES.OPS_MANAGE]));

router.get("/applications/:id/transmission-status", async (req, res, next) => {
  try {
    const status = await getTransmissionStatus(req.params.id);
    res.json({ transmission: status });
  } catch (err) {
    next(err);
  }
});

router.post("/transmissions/:id/retry", async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("missing_token", "Authorization token is required.", 401);
    }
    const result = await retrySubmission({
      submissionId: req.params.id,
      actorUserId: req.user.userId,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    res.json({ retry: result });
  } catch (err) {
    next(err);
  }
});

router.post("/transmissions/:id/cancel", async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("missing_token", "Authorization token is required.", 401);
    }
    const result = await cancelSubmissionRetry({
      submissionId: req.params.id,
      actorUserId: req.user.userId,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    res.json({ retry: result });
  } catch (err) {
    next(err);
  }
});

export default router;
