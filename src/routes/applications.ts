import { Router, type Request, type Response } from "express";
import { randomUUID, createHash } from "crypto";
import requireAuth, { requireCapability } from "../middleware/auth";
import { CAPABILITIES } from "../auth/capabilities";
import applicationRoutes from "../modules/applications/applications.routes";
import { respondOk } from "../utils/respondOk";

type ApplicationPayload = {
  country?: string;
  productCategory?: string;
  business?: { legalName?: string };
  applicant?: { firstName?: string; lastName?: string; email?: string };
};

type IdempotencyRecord = {
  applicationId: string;
  payloadHash: string;
};

const router = Router();
const idempotencyCache = new Map<string, IdempotencyRecord>();

router.get(
  "/",
  requireAuth,
  requireCapability([CAPABILITIES.APPLICATION_READ]),
  (req, res) => {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 25;
    const stage =
      typeof req.query.stage === "string" && req.query.stage.trim().length > 0
        ? req.query.stage.trim()
        : "new";
    respondOk(
      res,
      {
        applications: [],
        total: 0,
        stage,
      },
      {
        page,
        pageSize,
      }
    );
  }
);

router.post("/", (req: Request, res: Response) => {
  const payload = (req.body ?? {}) as ApplicationPayload;
  const missingFields: string[] = [];
  if (!payload.country) missingFields.push("country");
  if (!payload.productCategory) missingFields.push("productCategory");
  if (!payload.business?.legalName) missingFields.push("business.legalName");
  if (!payload.applicant?.firstName) missingFields.push("applicant.firstName");
  if (!payload.applicant?.lastName) missingFields.push("applicant.lastName");
  if (!payload.applicant?.email) missingFields.push("applicant.email");

  if (missingFields.length > 0) {
    res.status(400).json({
      code: "validation_error",
      message: "Missing required fields.",
      details: { fields: missingFields },
      requestId: res.locals.requestId ?? "unknown",
    });
    return;
  }

  const idempotencyKey = req.get("idempotency-key")?.trim() ?? "";
  if (idempotencyKey) {
    const payloadHash = createHash("sha256")
      .update(JSON.stringify(payload))
      .digest("hex");
    const existing = idempotencyCache.get(idempotencyKey);
    if (existing) {
      if (existing.payloadHash !== payloadHash) {
        res.status(409).json({
          code: "idempotency_conflict",
          message: "Idempotency-Key reuse with different payload.",
          requestId: res.locals.requestId ?? "unknown",
        });
        return;
      }
      res.status(201).json({
        applicationId: existing.applicationId,
        status: "created",
      });
      return;
    }
    const applicationId = randomUUID();
    idempotencyCache.set(idempotencyKey, { applicationId, payloadHash });
    res.status(201).json({
      applicationId,
      status: "created",
    });
    return;
  }

  res.status(201).json({
    applicationId: randomUUID(),
    status: "created",
  });
});

router.use("/", applicationRoutes);

export default router;
