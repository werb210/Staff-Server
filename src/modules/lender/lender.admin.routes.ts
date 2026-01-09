import { Router, Request, Response, NextFunction } from "express";
import { getTransmissionStatus, retrySubmission, cancelSubmissionRetry } from "./lender.service";
import { AppError } from "../../middleware/errors";

const router = Router();

router.get(
  "/applications/:id/transmission-status",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = await getTransmissionStatus(req.params.id);
      res.json({ transmission: status });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/transmissions/:id/retry",
  async (req: Request, res: Response, next: NextFunction) => {
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
  }
);

router.post(
  "/transmissions/:id/cancel",
  async (req: Request, res: Response, next: NextFunction) => {
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
  }
);

export default router;
