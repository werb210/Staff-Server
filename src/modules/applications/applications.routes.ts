import { Router } from "express";
import { AppError, forbiddenError } from "../../middleware/errors";
import {
  changePipelineState,
  createApplicationForUser,
  acceptDocumentVersion,
  rejectDocumentVersion,
  uploadDocument,
} from "./applications.service";
import requireAuth, { requireCapability } from "../../middleware/auth";
import { CAPABILITIES } from "../../auth/capabilities";
import { documentUploadRateLimit } from "../../middleware/rateLimit";
import { safeHandler } from "../../middleware/safeHandler";

const router = Router();

router.post(
  "/",
  requireAuth,
  requireCapability([CAPABILITIES.APPLICATION_CREATE]),
  safeHandler(async (req, res) => {
    const { name, metadata, productType } = req.body ?? {};
    if (!req.user) {
      throw new AppError("missing_token", "Authorization token is required.", 401);
    }
    if (!name || typeof name !== "string") {
      throw new AppError("missing_fields", "Name is required.", 400);
    }
    const role = req.user.role;
    if (!role) {
      throw forbiddenError();
    }
    const result = await createApplicationForUser({
      ownerUserId: req.user.userId,
      name,
      metadata: metadata ?? null,
      productType: productType ?? null,
      actorUserId: req.user.userId,
      actorRole: role,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    res.status(result.status).json({ application: result.value });
  })
);

router.post(
  "/:id/documents",
  requireAuth,
  requireCapability([CAPABILITIES.DOCUMENT_UPLOAD]),
  documentUploadRateLimit(),
  safeHandler(async (req, res) => {
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
    if (!role) {
      throw forbiddenError();
    }
    const result = await uploadDocument({
      applicationId: req.params.id,
      documentId: documentId ?? null,
      title,
      documentType: documentType ?? null,
      metadata,
      content,
      actorUserId: req.user.userId,
      actorRole: role,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    res.status(result.status).json({ document: result.value });
  })
);

router.post(
  "/:id/pipeline",
  requireAuth,
  requireCapability([CAPABILITIES.PIPELINE_MANAGE]),
  safeHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError("missing_token", "Authorization token is required.", 401);
    }
    const { state, override } = req.body ?? {};
    if (!state || typeof state !== "string") {
      throw new AppError("missing_fields", "state is required.", 400);
    }
    const capabilities = req.user.capabilities ?? [];
    if (override && !capabilities.includes(CAPABILITIES.PIPELINE_OVERRIDE)) {
      throw new AppError("forbidden", "Override not permitted.", 403);
    }
    const role = req.user.role;
    if (!role) {
      throw forbiddenError();
    }
    await changePipelineState({
      applicationId: req.params.id,
      nextState: state,
      actorUserId: req.user.userId,
      actorRole: role,
      allowOverride: Boolean(override),
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    res.json({ ok: true });
  })
);

router.post(
  "/:id/documents/:documentId/versions/:versionId/accept",
  requireAuth,
  requireCapability([CAPABILITIES.DOCUMENT_REVIEW]),
  safeHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError("missing_token", "Authorization token is required.", 401);
    }
    const role = req.user.role;
    if (!role) {
      throw forbiddenError();
    }
    await acceptDocumentVersion({
      applicationId: req.params.id,
      documentId: req.params.documentId,
      documentVersionId: req.params.versionId,
      actorUserId: req.user.userId,
      actorRole: role,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    res.json({ ok: true });
  })
);

router.post(
  "/:id/documents/:documentId/versions/:versionId/reject",
  requireAuth,
  requireCapability([CAPABILITIES.DOCUMENT_REVIEW]),
  safeHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError("missing_token", "Authorization token is required.", 401);
    }
    const role = req.user.role;
    if (!role) {
      throw forbiddenError();
    }
    await rejectDocumentVersion({
      applicationId: req.params.id,
      documentId: req.params.documentId,
      documentVersionId: req.params.versionId,
      actorUserId: req.user.userId,
      actorRole: role,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    res.json({ ok: true });
  })
);

export default router;
