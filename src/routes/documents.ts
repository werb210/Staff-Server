import { Router } from "express";
import multer from "multer";
import { AppError } from "../middleware/errors";
import { safeHandler } from "../middleware/safeHandler";
import { requireAuth, requireCapability } from "../middleware/auth";
import { CAPABILITIES } from "../auth/capabilities";
import { isRole } from "../auth/roles";
import {
  createDocument,
  createDocumentVersion,
  findActiveDocumentVersion,
  findApplicationById,
  findDocumentById,
  getLatestDocumentVersion,
  upsertApplicationRequiredDocument,
  updateDocumentUploadDetails,
} from "../modules/applications/applications.repo";
import { getDocumentMaxSizeBytes } from "../config";
import {
  acceptDocument,
  rejectDocument,
} from "../modules/applications/applications.service";
import { resolveRequirementsForApplication } from "../services/lenderProductRequirementsService";
import { normalizeRequiredDocumentKey } from "../db/schema/requiredDocuments";
import {
  createBankingAnalysisJob,
  createDocumentProcessingJob,
} from "../modules/processing/processing.service";

const BANK_STATEMENT_CATEGORY = "bank_statements_6_months";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: getDocumentMaxSizeBytes(),
  },
});

const router = Router();

router.post(
  "/",
  upload.single("file"),
  safeHandler(async (req, res) => {
    const applicationId = typeof req.body?.applicationId === "string"
      ? req.body.applicationId.trim()
      : "";
    const category =
      typeof req.body?.category === "string" ? req.body.category.trim() : "";
    if (!applicationId) {
      throw new AppError("validation_error", "applicationId is required.", 400);
    }
    if (!category) {
      throw new AppError("validation_error", "category is required.", 400);
    }
    if (!req.file) {
      throw new AppError("validation_error", "file is required.", 400);
    }

    const application = await findApplicationById(applicationId);
    if (!application) {
      throw new AppError("not_found", "Application not found.", 404);
    }

    const { requirements } = await resolveRequirementsForApplication({
      lenderProductId: application.lender_product_id ?? null,
      productType: application.product_type,
      requestedAmount: application.requested_amount ?? null,
      country:
        typeof application.metadata === "object" && application.metadata !== null
          ? (application.metadata as { country?: string }).country ?? null
          : null,
    });
    const normalizedCategory = normalizeRequiredDocumentKey(category) ?? category;
    const requirement = requirements.find((item) => {
      const normalizedRequirement = normalizeRequiredDocumentKey(item.documentType);
      if (normalizedRequirement) {
        return normalizedRequirement === normalizedCategory;
      }
      return item.documentType === category;
    });
    if (!requirement) {
      throw new AppError("invalid_document_type", "Document type is not allowed.", 400);
    }

    const document = await createDocument({
      applicationId,
      ownerUserId: application.owner_user_id,
      title: req.file.originalname,
      documentType: category,
      filename: req.file.originalname,
      uploadedBy: "client",
    });
    const nextVersion = (await getLatestDocumentVersion(document.id)) + 1;
    const storageKey = `documents/${document.id}/${req.file.originalname}`;
    await createDocumentVersion({
      documentId: document.id,
      version: nextVersion,
      metadata: {
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        storageKey,
      },
      content: req.file.buffer.toString("base64"),
    });
    await updateDocumentUploadDetails({
      documentId: document.id,
      status: "uploaded",
      filename: req.file.originalname,
      storageKey,
      uploadedBy: "client",
    });
    await upsertApplicationRequiredDocument({
      applicationId,
      documentCategory: normalizedCategory,
      isRequired: requirement.required !== false,
      status: "uploaded",
    });

    if (normalizedCategory === BANK_STATEMENT_CATEGORY) {
      await createBankingAnalysisJob(applicationId);
    } else {
      await createDocumentProcessingJob(applicationId, document.id);
    }

    res.status(201).json({
      documentId: document.id,
      applicationId,
      category,
      filename: req.file.originalname,
      size: req.file.size,
      storageKey,
      createdAt: document.created_at,
    });
  })
);

router.get(
  "/:id/presign",
  safeHandler(async (req, res) => {
    const documentId = typeof req.params.id === "string" ? req.params.id.trim() : "";
    if (!documentId) {
      throw new AppError("validation_error", "documentId is required.", 400);
    }
    const document = await findDocumentById(documentId);
    if (!document) {
      throw new AppError("not_found", "Document not found.", 404);
    }
    const version = await findActiveDocumentVersion({ documentId: document.id });
    if (!version) {
      throw new AppError("not_found", "Document version not found.", 404);
    }
    const metadata =
      version.metadata && typeof version.metadata === "object"
        ? (version.metadata as {
            fileName?: string;
            mimeType?: string;
            size?: number;
            storageKey?: string;
          })
        : {};
    const storageKey = metadata.storageKey ?? null;
    res.status(200).json({
      documentId: document.id,
      version: version.version,
      filename: metadata.fileName ?? document.title,
      mimeType: metadata.mimeType ?? null,
      size: metadata.size ?? null,
      storageKey,
      url: storageKey ? `/api/documents/${document.id}/download?key=${storageKey}` : null,
    });
  })
);

router.post(
  "/:id/accept",
  requireAuth,
  requireCapability([CAPABILITIES.DOCUMENT_REVIEW]),
  safeHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError("missing_token", "Authorization token is required.", 401);
    }
    if (!isRole(req.user.role)) {
      throw new AppError("forbidden", "Not authorized.", 403);
    }
    await acceptDocument({
      documentId: req.params.id,
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    res.status(200).json({ ok: true });
  })
);

router.post(
  "/:id/reject",
  requireAuth,
  requireCapability([CAPABILITIES.DOCUMENT_REVIEW]),
  safeHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError("missing_token", "Authorization token is required.", 401);
    }
    if (!isRole(req.user.role)) {
      throw new AppError("forbidden", "Not authorized.", 403);
    }
    const reason =
      typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    if (!reason) {
      throw new AppError("validation_error", "Rejection reason is required.", 400);
    }
    await rejectDocument({
      documentId: req.params.id,
      rejectionReason: reason,
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    res.status(200).json({ ok: true });
  })
);

export default router;
