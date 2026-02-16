import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuth, requireCapability } from "../middleware/auth";
import { CAPABILITIES } from "../auth/capabilities";
import applicationRoutes from "../modules/applications/applications.routes";
import { AppError } from "../middleware/errors";
import { getClientSubmissionOwnerUserId } from "../config";
import { db } from "../db";
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
import { logAnalyticsEvent } from "../services/analyticsService";
import { pushLeadToCRM } from "../services/crmWebhook";
import { convertContinuation } from "../modules/continuation/continuation.service";
import { upsertCrmLead } from "../modules/crm/leadUpsert.service";
import { createApplicationSchema } from "../validation/application.schema";

const applicationSubmissionSchema = z.object({
  business: z.object({
    legalName: z.string().trim().min(1),
    industry: z.string().trim().min(1),
    country: z.string().trim().min(1),
  }),
  financialProfile: z.object({
    yearsInBusiness: createApplicationSchema.shape.yearsInBusiness,
    monthlyRevenue: createApplicationSchema.shape.monthlyRevenue,
    annualRevenue: createApplicationSchema.shape.annualRevenue,
    arBalance: createApplicationSchema.shape.arBalance,
    collateralAvailable: createApplicationSchema.shape.collateralAvailable,
  }),
  productSelection: z.object({
    requestedProductType: z.string().trim().min(1),
    useOfFunds: z.string().trim().min(1),
    capitalRequested: z.coerce.number().finite().min(0),
    equipmentAmount: z.coerce.number().finite().min(0),
  }),
  contact: z.object({
    fullName: z.string().trim().min(1),
    email: z.string().trim().email(),
    phone: z.string().trim().min(1),
  }),
  source: z.enum(["website", "client"]).default("client"),
  continuationToken: z.string().trim().min(1).optional(),
  continuationId: z.string().trim().min(1).optional(),
});

const EMPTY_OCR_INSIGHTS: ApplicationResponse["ocrInsights"] = {
  fields: {},
  missingFields: [],
  conflictingFields: [],
  warnings: [],
  groupedByDocumentType: {},
  groupedByFieldCategory: {},
};

const router = Router();

const intakeFields = ["business", "financialProfile", "productSelection", "contact"];

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
 * GET /api/applications/:id/ocr-insights
 */
router.get(
  "/:id/ocr-insights",
  requireAuth,
  requireCapability([CAPABILITIES.APPLICATION_READ]),
  safeHandler(async (req, res) => {
    const applicationId = req.params.id;
    if (!applicationId) {
      throw new AppError("validation_error", "Application id is required.", 400);
    }
    const application = await findApplicationById(applicationId);
    if (!application) {
      throw new AppError("not_found", "Application not found.", 404);
    }
    const ocrInsights = await getOcrInsightsForApplication(application.id);
    res.status(200).json({ ocrInsights });
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

      const parsedPayload = applicationSubmissionSchema.safeParse(body);
      if (!parsedPayload.success) {
        const err = new AppError("validation_error", "Invalid or missing required application fields.", 400);
        (err as { details?: unknown }).details = parsedPayload.error.flatten();
        throw err;
      }
      const payload = parsedPayload.data;
      const continuationToken = payload.continuationToken;
      const continuationId = payload.continuationId;

      const ownerUserId =
        req.user?.userId ?? getClientSubmissionOwnerUserId();

      const created = await createApplication({
        ownerUserId,
        name: payload.business?.legalName ?? "New application",
        metadata: {
          source: payload.source ?? null,
          country: payload.business.country,
          productCategory: payload.productSelection.requestedProductType,
          business: payload.business ?? null,
          contact: payload.contact,
          productSelection: payload.productSelection,
          financialProfile: payload.financialProfile ?? null,
        },
        productType: payload.productSelection.requestedProductType,
        productCategory: payload.productSelection.requestedProductType,
        trigger: "application_created",
        triggeredBy: req.user?.userId ?? "system",
      });


      if (typeof body.readinessScore === "number") {
        await logAnalyticsEvent({
          event: "readiness_score",
          metadata: {
            score: body.readinessScore,
            applicationId: created.id,
          },
          ...(req.ip ? { ip: req.ip } : {}),
          ...(req.headers["user-agent"] ? { userAgent: req.headers["user-agent"] } : {}),
        });
      }

      if (continuationToken) {
        await convertContinuation(continuationToken, created.id);
      }

      if (continuationId) {
        await db.query(
          `
            update continuation
            set used_in_application = true
            where id = $1
          `,
          [continuationId]
        );
      }

      const [firstName, ...restNames] = payload.contact.fullName.split(" ");
      await pushLeadToCRM({
        type: "application_submitted",
        applicationId: created.id,
        source: payload.source ?? null,
        applicant: {
          firstName,
          lastName: restNames.join(" "),
          email: payload.contact.email,
        },
      });

      await upsertCrmLead({
        companyName: payload.business.legalName,
        fullName: payload.contact.fullName,
        email: payload.contact.email,
        phone: payload.contact.phone,
        industry: payload.business.industry,
        yearsInBusiness: payload.financialProfile.yearsInBusiness,
        monthlyRevenue: payload.financialProfile.monthlyRevenue,
        annualRevenue: payload.financialProfile.annualRevenue,
        arBalance: payload.financialProfile.arBalance,
        collateralAvailable: payload.financialProfile.collateralAvailable,
        source: payload.source,
        tags: ["application_started"],
        activityType: "application_submission",
        activityPayload: { applicationId: created.id },
      });

      res.status(201).json({
        applicationId: created.id,
        createdAt: created.created_at,
        pipelineState: normalizePipelineStage(created.pipeline_state),
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
      const applicationId = req.params.id;
      if (!applicationId) {
        res.status(400).json({
          code: "validation_error",
          message: "Application id is required.",
          requestId: res.locals.requestId ?? "unknown",
        });
        return;
      }
      const record = await findApplicationById(applicationId);
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
