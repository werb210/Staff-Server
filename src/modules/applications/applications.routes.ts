import { Router, type Request } from "express";
import { AppError, forbiddenError } from "../../middleware/errors";
import {
  changePipelineState,
  createApplicationForUser,
  listDocumentsForApplication,
  openApplicationForStaff,
  acceptDocumentVersion,
  rejectDocumentVersion,
  removeDocument,
  uploadDocument,
} from "./applications.service";
import { createApplication } from "./applications.repo";
import { getApplicationProcessingStatus } from "./applications.controller";
import { requireAuth, requireCapability } from "../../middleware/auth";
import { CAPABILITIES } from "../../auth/capabilities";
import { isRole } from "../../auth/roles";
import { documentUploadRateLimit } from "../../middleware/rateLimit";
import { safeHandler } from "../../middleware/safeHandler";
import { logError } from "../../observability/logger";

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

router.post(
  "/",
  requireAuth,
  requireCapability([CAPABILITIES.APPLICATION_CREATE]),
  safeHandler(async (req, res) => {
    try {
      const { name, metadata, productType } = req.body ?? {};
      if (!req.user) {
        throw new AppError("missing_token", "Authorization token is required.", 401);
      }
      if (!name || typeof name !== "string") {
        throw new AppError("missing_fields", "Name is required.", 400);
      }
      const role = req.user.role;
      if (!role || !isRole(role)) {
        throw forbiddenError();
      }
      const createPayload = {
        ownerUserId: req.user.userId,
        name,
        metadata: metadata ?? null,
        productType: productType ?? null,
        actorUserId: req.user.userId,
        actorRole: role,
        override: Boolean(override),
        ...buildRequestMetadata(req),
      };
      let result;
      try {
        result = await createApplicationForUser(createPayload);
      } catch (_err) {
        const created = await createApplication({
          ownerUserId: req.user.userId,
          name,
          metadata: metadata ?? null,
          productType: productType ?? "standard",
          trigger: "application_created",
          triggeredBy: req.user.userId,
        });
        result = {
          status: 201,
          value: {
            id: created.id,
            ownerUserId: created.owner_user_id,
            name: created.name,
            metadata: created.metadata,
            productType: created.product_type,
            pipelineState: created.pipeline_state,
            lenderId: created.lender_id ?? null,
            lenderProductId: created.lender_product_id ?? null,
            requestedAmount: created.requested_amount ?? null,
            createdAt: created.created_at,
            updatedAt: created.updated_at,
            ocrInsights: {
              fields: {},
              missingFields: [],
              conflictingFields: [],
              warnings: [],
              groupedByDocumentType: {},
              groupedByFieldCategory: {},
            },
          },
        };
      }
      res.status(result.status).json({ application: result.value });
    } catch (err) {
      logError("applications_create_failed", {
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
  "/:id/processing-status",
  requireAuth,
  requireCapability([CAPABILITIES.APPLICATION_READ]),
  safeHandler(getApplicationProcessingStatus)
);

router.get(
  "/:id/documents",
  requireAuth,
  requireCapability([CAPABILITIES.APPLICATION_READ]),
  safeHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError("missing_token", "Authorization token is required.", 401);
    }
    const role = req.user.role;
    if (!role || !isRole(role)) {
      throw forbiddenError();
    }
    const applicationId = req.params.id;
    if (!applicationId) {
      throw new AppError("validation_error", "application id is required.", 400);
    }
    const documents = await listDocumentsForApplication({
      applicationId,
      actorUserId: req.user.userId,
      actorRole: role,
    });
    res.status(200).json({ documents });
  })
);

router.post(
  "/:id/open",
  requireAuth,
  requireCapability([CAPABILITIES.APPLICATION_READ]),
  safeHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError("missing_token", "Authorization token is required.", 401);
    }
    const role = req.user.role;
    if (!role || !isRole(role)) {
      throw forbiddenError();
    }
    const applicationId = req.params.id;
    if (!applicationId) {
      throw new AppError("validation_error", "application id is required.", 400);
    }
    const openPayload = {
      applicationId,
      actorUserId: req.user.userId,
      actorRole: role,
      ...buildRequestMetadata(req),
    };
    await openApplicationForStaff(openPayload);
    res.status(200).json({ ok: true });
  })
);

router.post(
  "/:id/documents",
  requireAuth,
  requireCapability([CAPABILITIES.DOCUMENT_UPLOAD]),
  documentUploadRateLimit(),
  safeHandler(async (req, res) => {
    try {
      if (!req.user) {
        throw new AppError("missing_token", "Authorization token is required.", 401);
      }
      const { title, metadata, content, documentId, documentType } = req.body ?? {};
      if (!title || !metadata || !content) {
        throw new AppError(
          "missing_fields",
          "title, metadata, and content are required.",
          400
        );
      }
      const role = req.user.role;
      if (!role || !isRole(role)) {
        throw forbiddenError();
      }
      const applicationId = req.params.id;
      if (!applicationId) {
        throw new AppError("validation_error", "application id is required.", 400);
      }
      const uploadPayload = {
        applicationId,
        documentId: documentId ?? null,
        title,
        documentType: documentType ?? null,
        metadata,
        content,
        actorUserId: req.user.userId,
        actorRole: role,
        override: Boolean(override),
        ...buildRequestMetadata(req),
      };
      const result = await uploadDocument(uploadPayload);
      res.status(result.status).json({ document: result.value });
    } catch (err) {
      logError("applications_upload_failed", {
        error:
          err instanceof Error
            ? { name: err.name, message: err.message, stack: err.stack }
            : err,
      });
      throw err;
    }
  })
);

router.delete(
  "/:id/documents/:documentId",
  requireAuth,
  requireCapability([CAPABILITIES.DOCUMENT_REVIEW]),
  safeHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError("missing_token", "Authorization token is required.", 401);
    }
    const role = req.user.role;
    if (!role || !isRole(role)) {
      throw forbiddenError();
    }
    const applicationId = req.params.id;
    const documentId = req.params.documentId;
    if (!applicationId || !documentId) {
      throw new AppError("validation_error", "application id is required.", 400);
    }
    const removePayload = {
      applicationId,
      documentId,
      actorUserId: req.user.userId,
      actorRole: role,
      ...buildRequestMetadata(req),
    };
    await removeDocument(removePayload);
    res.status(200).json({ ok: true });
  })
);

router.post(
  "/:id/pipeline",
  requireAuth,
  requireCapability([CAPABILITIES.PIPELINE_MANAGE]),
  safeHandler(async (req, res) => {
    try {
      if (!req.user) {
        throw new AppError("missing_token", "Authorization token is required.", 401);
      }
      const { state, override } = req.body ?? {};
      if (!state || typeof state !== "string") {
        throw new AppError("missing_fields", "state is required.", 400);
      }
      const role = req.user.role;
      if (!role || !isRole(role)) {
        throw forbiddenError();
      }
      const applicationId = req.params.id;
      if (!applicationId) {
        throw new AppError("validation_error", "application id is required.", 400);
      }
      const changePayload = {
        applicationId,
        nextState: state,
        actorUserId: req.user.userId,
        actorRole: role,
        override: Boolean(override),
        ...buildRequestMetadata(req),
      };
      await changePipelineState(changePayload);
      res.json({ ok: true });
    } catch (err) {
      logError("applications_pipeline_change_failed", {
        error:
          err instanceof Error
            ? { name: err.name, message: err.message, stack: err.stack }
            : err,
      });
      throw err;
    }
  })
);

router.post(
  "/:id/documents/:documentId/versions/:versionId/accept",
  requireAuth,
  requireCapability([CAPABILITIES.DOCUMENT_REVIEW]),
  safeHandler(async (req, res) => {
    try {
      if (!req.user) {
        throw new AppError("missing_token", "Authorization token is required.", 401);
      }
      const role = req.user.role;
      if (!role || !isRole(role)) {
        throw forbiddenError();
      }
      const applicationId = req.params.id;
      const documentId = req.params.documentId;
      const documentVersionId = req.params.versionId;
      if (!applicationId || !documentId || !documentVersionId) {
        throw new AppError("validation_error", "application id is required.", 400);
      }
      const acceptPayload = {
        applicationId,
        documentId,
        documentVersionId,
        actorUserId: req.user.userId,
        actorRole: role,
        override: Boolean(override),
        ...buildRequestMetadata(req),
      };
      await acceptDocumentVersion(acceptPayload);
      res.json({ ok: true });
    } catch (err) {
      logError("applications_document_accept_failed", {
        error:
          err instanceof Error
            ? { name: err.name, message: err.message, stack: err.stack }
            : err,
      });
      throw err;
    }
  })
);

router.post(
  "/:id/documents/:documentId/versions/:versionId/reject",
  requireAuth,
  requireCapability([CAPABILITIES.DOCUMENT_REVIEW]),
  safeHandler(async (req, res) => {
    try {
      if (!req.user) {
        throw new AppError("missing_token", "Authorization token is required.", 401);
      }
      const role = req.user.role;
      if (!role || !isRole(role)) {
        throw forbiddenError();
      }
      const applicationId = req.params.id;
      const documentId = req.params.documentId;
      const documentVersionId = req.params.versionId;
      if (!applicationId || !documentId || !documentVersionId) {
        throw new AppError("validation_error", "application id is required.", 400);
      }
      const rejectPayload = {
        applicationId,
        documentId,
        documentVersionId,
        actorUserId: req.user.userId,
        actorRole: role,
        override: Boolean(override),
        ...buildRequestMetadata(req),
      };
      await rejectDocumentVersion(rejectPayload);
      res.json({ ok: true });
    } catch (err) {
      logError("applications_document_reject_failed", {
        error:
          err instanceof Error
            ? { name: err.name, message: err.message, stack: err.stack }
            : err,
      });
      throw err;
    }
  })
);

export default router;
