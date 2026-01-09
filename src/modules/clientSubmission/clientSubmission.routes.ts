import { Router, Request, Response, NextFunction } from "express";
import { AppError } from "../../middleware/errors";
import { clientSubmissionRateLimit } from "../../middleware/rateLimit";
import { submitClientApplication } from "./clientSubmission.service";

const router = Router();

router.post(
  "/submissions",
  clientSubmissionRateLimit(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.body) {
        throw new AppError("invalid_payload", "Payload is required.", 400);
      }
      const result = await submitClientApplication({
        payload: req.body,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });
      res.status(result.status).json({ submission: result.value, idempotent: result.idempotent });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
