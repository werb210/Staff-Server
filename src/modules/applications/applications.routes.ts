import { Router } from "express";
import { AppError } from "../../middleware/errors";
import {
  changePipelineState,
  createApplicationForUser,
  acceptDocumentVersion,
  rejectDocumentVersion,
  uploadDocument,
} from "./applications.service";
import { requireAuth, requireCapability } from "../../middleware/auth";
import { CAPABILITIES } from "../../auth/capabilities";
import { documentUploadRateLimit } from "../../middleware/rateLimit";

const router = Router();

router.post(
  "/",
  requireAuth,
  requireCapability([CAPABILITIES.APPLICATION_CREATE]),
  async (req, res, next) => {
    try {
      const { name, metadata, productType, idempotencyKey } = req.body ?? {};
      if (!req.user) {
        throw new AppError("missing_token", "Authorization token is required.", 401);
      }
      if (!name || typeof name !== "string") {
        throw new AppError("missing_fields", "Name is required.", 400);
      }
      const result = await createApplicationForUser({
        ownerUserId: req.user.userId,
        name,
        metadata: metadata ?? null,
        productType: productType ?? null,
        idempotencyKey: idempotencyKey ?? null,
        actorUserId: req.user.userId,
        actorRole: req.user.role,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });
      res.status(result.status).json({ application: result.value });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/:id/documents",
  requireAuth,
  requireCapability([CAPABILITIES.DOCUMENT_UPLOAD]),
  documentUploadRateLimit(),
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError("missing_token", "Authorization token is required.", 401);
      }
      const { title, metadata, content, documentId, documentType, idempotencyKey } =
        req.body ?? {};
      if (!title || !metadata || !content) {
        throw new AppError(
          "missing_fields",
          "title, metadata, and content are required.",
          400
        );
      }
      const result = await uploadDocument({
        applicationId: req.params.id,
        documentId: documentId ?? null,
        title,
        documentType: documentType ?? null,
        metadata,
        content,
        idempotencyKey: idempotencyKey ?? null,
        actorUserId: req.user.userId,
        actorRole: req.user.role,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });
      res.status(result.status).json({ document: result.value });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/:id/pipeline",
  requireAuth,
  requireCapability([CAPABILITIES.PIPELINE_MANAGE]),
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError("missing_token", "Authorization token is required.", 401);
      }
      const { state, override } = req.body ?? {};
      if (!state || typeof state !== "string") {
        throw new AppError("missing_fields", "state is required.", 400);
      }
      if (override && !req.user.capabilities.includes(CAPABILITIES.PIPELINE_OVERRIDE)) {
        throw new AppError("forbidden", "Override not permitted.", 403);
      }
      await changePipelineState({
        applicationId: req.params.id,
        nextState: state,
        actorUserId: req.user.userId,
        actorRole: req.user.role,
        allowOverride: Boolean(override),
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/:id/documents/:documentId/versions/:versionId/accept",
  requireAuth,
  requireCapability([CAPABILITIES.DOCUMENT_REVIEW]),
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError("missing_token", "Authorization token is required.", 401);
      }
      await acceptDocumentVersion({
        applicationId: req.params.id,
        documentId: req.params.documentId,
        documentVersionId: req.params.versionId,
        actorUserId: req.user.userId,
        actorRole: req.user.role,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/:id/documents/:documentId/versions/:versionId/reject",
  requireAuth,
  requireCapability([CAPABILITIES.DOCUMENT_REVIEW]),
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError("missing_token", "Authorization token is required.", 401);
      }
      await rejectDocumentVersion({
        applicationId: req.params.id,
        documentId: req.params.documentId,
        documentVersionId: req.params.versionId,
        actorUserId: req.user.userId,
        actorRole: req.user.role,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
