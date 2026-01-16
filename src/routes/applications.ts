import { Router, type Request, type Response } from "express";
import requireAuth, { requireCapability } from "../middleware/auth";
import { CAPABILITIES } from "../auth/capabilities";
import applicationRoutes from "../modules/applications/applications.routes";
import { respondOk } from "../utils/respondOk";
import { AppError } from "../middleware/errors";
import { createApplication } from "../modules/applications/applications.repo";
import { safeHandler } from "../middleware/safeHandler";

type ApplicationPayload = {
  country?: string;
  productCategory?: string;
  source?: string;
  business?: { legalName?: string };
  applicant?: { firstName?: string; lastName?: string; email?: string };
  financialProfile?: unknown;
  match?: unknown;
};

const router = Router();
const intakeFields = [
  "source",
  "country",
  "productCategory",
  "business",
  "applicant",
  "financialProfile",
  "match",
];
const legacyFields = ["name", "metadata", "productType"];

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

router.post(
  "/",
  safeHandler(async (req: Request, res: Response, next) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const hasAuthHeader = Boolean(req.get("authorization"));
    const isIntakePayload = intakeFields.some((field) => field in body);
    const isLegacyPayload = legacyFields.some((field) => field in body);
    if (hasAuthHeader && (isLegacyPayload || !isIntakePayload)) {
      next();
      return;
    }
    const payload = (req.body ?? {}) as ApplicationPayload;
    const missingFields: string[] = [];
    if (!payload.source) missingFields.push("source");
    if (!payload.country) missingFields.push("country");
    if (!payload.productCategory) missingFields.push("productCategory");
    if (!payload.business?.legalName) missingFields.push("business.legalName");
    if (!payload.applicant?.firstName) missingFields.push("applicant.firstName");
    if (!payload.applicant?.lastName) missingFields.push("applicant.lastName");
    if (!payload.applicant?.email) missingFields.push("applicant.email");
    if (!payload.financialProfile) missingFields.push("financialProfile");
    if (!payload.match) missingFields.push("match");

    if (missingFields.length > 0) {
      const err = new AppError("validation_error", "Missing required fields.", 400);
      (err as { details?: unknown }).details = { fields: missingFields };
      throw err;
    }

    const ownerUserId = (req as Request & { user?: { id?: string } }).user?.id ?? null;
    const created = await createApplication({
      ownerUserId,
      name: payload.business?.legalName ?? "New application",
      pipelineState: "new",
      metadata: {
        source: payload.source ?? null,
        country: payload.country ?? null,
        productCategory: payload.productCategory ?? null,
        business: payload.business ?? null,
        applicant: payload.applicant ?? null,
        financialProfile: payload.financialProfile ?? null,
        match: payload.match ?? null,
      },
      productType: payload.productCategory ?? "standard",
    });
    res.status(201).json({
      applicationId: created.id,
      createdAt: created.created_at,
      pipelineState: created.pipeline_state,
      match: payload.match ?? null,
    });
  })
);

router.use("/", applicationRoutes);

export default router;
