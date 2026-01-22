import { Router, type Request, type Response } from "express";
import requireAuthWithInternalBypass from "../middleware/requireAuth";
import { requireCapability } from "../middleware/auth";
import { CAPABILITIES } from "../auth/capabilities";
import applicationRoutes from "../modules/applications/applications.routes";
import { AppError } from "../middleware/errors";
import { getClientSubmissionOwnerUserId } from "../config";
import {
  createApplication,
  listApplications,
  type ApplicationRecord,
} from "../modules/applications/applications.repo";
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

type ApplicationResponse = {
  id: string;
  ownerUserId: string | null;
  name: string;
  metadata: unknown | null;
  productType: string;
  pipelineState: string;
  createdAt: Date;
  updatedAt: Date;
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

function toApplicationResponse(
  record: ApplicationRecord
): ApplicationResponse {
  assertApplicationRecord(record);

  return {
    id: record.id,
    ownerUserId: record.owner_user_id,
    name: record.name,
    metadata: record.metadata,
    productType: record.product_type,
    pipelineState: record.pipeline_state,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function assertApplicationRecord(record: ApplicationRecord): void {
  if (
    !record ||
    typeof record.id !== "string" ||
    typeof record.name !== "string" ||
    typeof record.product_type !== "string" ||
    typeof record.pipeline_state !== "string" ||
    !(record.created_at instanceof Date) ||
    !(record.updated_at instanceof Date)
  ) {
    throw new AppError("data_error", "Invalid application record.", 500);
  }
}

/**
 * GET /api/applications
 */
router.get(
  "/",
  requireAuthWithInternalBypass,
  requireCapability([CAPABILITIES.APPLICATION_READ]),
  safeHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.max(1, Number(req.query.pageSize) || 25);

    const applications = await listApplications({
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    if (!Array.isArray(applications)) {
      res.status(200).json({ items: [] });
      return;
    }

    res.status(200).json({
      items: applications.map(toApplicationResponse),
    });
  })
);

/**
 * POST /api/applications
 * Handles intake-style submissions
 */
router.post(
  "/",
  requireAuthWithInternalBypass,
  safeHandler(async (req: Request, res: Response, next) => {
    const body = (req.body ?? {}) as Record<string, unknown>;

    const isIntakePayload = intakeFields.some((field) => field in body);
    const isLegacyPayload = legacyFields.some((field) => field in body);

    if (isLegacyPayload || !isIntakePayload) {
      next();
      return;
    }

    const payload = body as ApplicationPayload;
    const missingFields: string[] = [];

    if (!payload.source) missingFields.push("source");
    if (!payload.country) missingFields.push("country");
    if (!payload.productCategory) missingFields.push("productCategory");
    if (!payload.business?.legalName)
      missingFields.push("business.legalName");
    if (!payload.applicant?.firstName)
      missingFields.push("applicant.firstName");
    if (!payload.applicant?.lastName)
      missingFields.push("applicant.lastName");
    if (!payload.applicant?.email)
      missingFields.push("applicant.email");
    if (!payload.financialProfile)
      missingFields.push("financialProfile");
    if (!payload.match) missingFields.push("match");

    if (missingFields.length > 0) {
      const err = new AppError(
        "validation_error",
        "Missing required fields.",
        400
      );
      (err as { details?: unknown }).details = { fields: missingFields };
      throw err;
    }

    const ownerUserId =
      req.user?.userId ?? getClientSubmissionOwnerUserId();

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

/**
 * Nested application routes
 */
router.use(
  "/",
  requireAuthWithInternalBypass,
  applicationRoutes
);

export default router;
