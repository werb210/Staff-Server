import { Router, type Request, type Response } from "express";
import { requireAuth, requireCapability } from "../middleware/auth";
import { CAPABILITIES } from "../auth/capabilities";
import applicationRoutes from "../modules/applications/applications.routes";
import { AppError } from "../middleware/errors";
import { getClientSubmissionOwnerUserId } from "../config";
import {
  createApplication,
  listApplications,
  findApplicationById,
  type ApplicationRecord,
} from "../modules/applications/applications.repo";
import { ApplicationStage } from "../modules/applications/pipelineState";
import { type ApplicationResponse } from "../modules/applications/application.dto";
import { getOcrInsightsForApplication } from "../modules/applications/ocr/ocrAnalysis.service";
import { safeHandler } from "../middleware/safeHandler";
import { logError } from "../observability/logger";

type ApplicationPayload = {
  country?: string;
  productCategory?: string;
  source?: string;
  business?: { legalName?: string };
  applicant?: { firstName?: string; lastName?: string; email?: string };
  financialProfile?: unknown;
  match?: unknown;
};

const EMPTY_OCR_INSIGHTS: ApplicationResponse["ocrInsights"] = {
  fields: {},
  missingFields: [],
  conflictingFields: [],
  warnings: [],
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
const DEFAULT_PIPELINE_STAGE = ApplicationStage.RECEIVED;

function normalizePipelineStage(stage: string | null): string {
  return stage ?? DEFAULT_PIPELINE_STAGE;
}

async function toApplicationResponse(
  record: ApplicationRecord
): Promise<ApplicationResponse> {
  assertApplicationRecord(record);
  let ocrInsights = EMPTY_OCR_INSIGHTS;
  try {
    ocrInsights = await getOcrInsightsForApplication(record.id);
  } catch (error) {
    logError("ocr_insights_fetch_failed", {
      code: "ocr_insights_fetch_failed",
      applicationId: record.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return {
    id: record.id,
    ownerUserId: record.owner_user_id,
    name: record.name,
    metadata: record.metadata,
    productType: record.product_type,
    pipelineState: normalizePipelineStage(record.pipeline_state),
    lenderId: record.lender_id ?? null,
    lenderProductId: record.lender_product_id ?? null,
    requestedAmount: record.requested_amount ?? null,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    ocrInsights,
  };
}

function assertApplicationRecord(record: ApplicationRecord): void {
  if (
    !record ||
    typeof record.id !== "string" ||
    typeof record.name !== "string" ||
    typeof record.product_type !== "string" ||
    (record.pipeline_state !== null && typeof record.pipeline_state !== "string") ||
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
  requireAuth,
  requireCapability([CAPABILITIES.APPLICATION_READ]),
  safeHandler(async (req, res) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const pageSize = Math.max(1, Number(req.query.pageSize) || 25);
      const stage = typeof req.query.stage === "string" ? req.query.stage : null;

      const applications = await listApplications({
        limit: pageSize,
        offset: (page - 1) * pageSize,
        stage,
      });

      if (!Array.isArray(applications)) {
        res.status(200).json({ items: [] });
        return;
      }

      const items = await Promise.all(applications.map((record) => toApplicationResponse(record)));
      res.status(200).json({ items });
    } catch (err) {
      logError("applications_list_failed", {
        error:
          err instanceof Error
            ? { name: err.name, message: err.message, stack: err.stack }
            : err,
      });
      res.status(200).json({ items: [] });
    }
  })
);

/**
 * POST /api/applications
 * Handles intake-style submissions
 */
router.post(
  "/",
  requireAuth,
  requireCapability([CAPABILITIES.APPLICATION_CREATE]),
  safeHandler(async (req: Request, res: Response, next) => {
    try {
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
        pipelineState: ApplicationStage.RECEIVED,
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
        pipelineState: normalizePipelineStage(created.pipeline_state),
        match: payload.match ?? null,
      });
    } catch (err) {
      logError("applications_intake_create_failed", {
        error:
          err instanceof Error
            ? { name: err.name, message: err.message, stack: err.stack }
            : err,
      });
      throw err;
    }
  })
);

router.get(
  "/:id",
  requireAuth,
  requireCapability([CAPABILITIES.APPLICATION_READ]),
  safeHandler(async (req, res) => {
    try {
      const record = await findApplicationById(req.params.id);
      if (!record) {
        res.status(404).json({
          code: "not_found",
          message: "Application not found.",
          requestId: res.locals.requestId ?? "unknown",
        });
        return;
      }
      res.status(200).json({ application: await toApplicationResponse(record) });
    } catch (err) {
      logError("application_fetch_failed", {
        error:
          err instanceof Error
            ? { name: err.name, message: err.message, stack: err.stack }
            : err,
      });
      res.status(200).json({ application: null });
    }
  })
);

/**
 * Nested application routes
 */
router.use(
  "/",
  requireAuth,
  applicationRoutes
);

export default router;
