import { randomUUID } from "crypto";
import { Router, type Request } from "express";
import { z } from "zod";
import { pool } from "../../db";
import { getClientSubmissionOwnerUserId } from "../../config";
import { AppError } from "../../middleware/errors";
import { clientSubmissionRateLimit } from "../../middleware/rateLimit";
import { submitClientApplication } from "./clientSubmission.service";
import { ApplicationStage } from "../applications/pipelineState";

const router = Router();

function buildRequestMetadata(req: Request): { ip?: string; userAgent?: string } {
  const metadata: { ip?: string; userAgent?: string } = {};
  if (req.ip) {
    metadata.ip = req.ip;
  }
  const userAgent = req.get("user-agent");
  if (userAgent) {
    metadata.userAgent = userAgent;
  }
  return metadata;
}

const quickSubmissionSchema = z.object({
  business_name: z.string().min(1),
  requested_amount: z.number().positive(),
  lender_id: z.string().uuid(),
  product_id: z.string().uuid(),
});

router.post("/submissions", clientSubmissionRateLimit(), async (req, res, next) => {
  const quickParsed = quickSubmissionSchema.safeParse(req.body);
  if (quickParsed.success) {
    const { business_name, requested_amount, lender_id, product_id } = quickParsed.data;
    try {
      const applicationId = randomUUID();
      const ownerUserId = getClientSubmissionOwnerUserId();
      await pool.query(
        `insert into applications
          (id, owner_user_id, name, metadata, product_type, pipeline_state, status, lender_id, lender_product_id, requested_amount, source, created_at, updated_at)
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now(), now())`,
        [
          applicationId,
          ownerUserId,
          business_name,
          null,
          "standard",
          ApplicationStage.RECEIVED,
          ApplicationStage.RECEIVED,
          lender_id,
          product_id,
          requested_amount,
          "client",
        ]
      );
      res.status(201).json({ id: applicationId });
      return;
    } catch (err) {
      next(err);
      return;
    }
  }

  try {
    if (!req.body) {
      throw new AppError("invalid_payload", "Payload is required.", 400);
    }
    const result = await submitClientApplication({
      payload: req.body,
      ...buildRequestMetadata(req),
    });
    res.status(result.status).json({ submission: result.value, idempotent: result.idempotent });
  } catch (err) {
    next(err);
  }
});

export default router;
