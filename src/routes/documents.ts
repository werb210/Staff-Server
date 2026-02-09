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
  findApplicationRequiredDocumentById,
  updateApplicationRequiredDocumentStatusById,
} from "../modules/applications/applications.repo";
import { getDocumentMaxSizeBytes } from "../config";
import { enqueueOcrForDocument } from "../modules/ocr/ocr.service";
import { logError } from "../observability/logger";
import { ApplicationStage } from "../modules/applications/pipelineState";
import { transitionPipelineState } from "../modules/applications/applications.service";

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

    const document = await createDocument({
      applicationId,
      ownerUserId: application.owner_user_id,
      title: req.file.originalname,
      documentType: category,
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

    try {
      await enqueueOcrForDocument(document.id);
    } catch (error) {
      logError("ocr_enqueue_failed", {
        code: "ocr_enqueue_failed",
        applicationId,
        documentId: document.id,
        error: error instanceof Error ? error.message : String(error),
      });
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
    const documentId = req.params.id;
    const document = await findApplicationRequiredDocumentById({ documentId });
    if (!document) {
      throw new AppError("not_found", "Document not found.", 404);
    }
    await updateApplicationRequiredDocumentStatusById({
      documentId,
      status: "accepted",
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
    const documentId = req.params.id;
    const document = await findApplicationRequiredDocumentById({ documentId });
    if (!document) {
      throw new AppError("not_found", "Document not found.", 404);
    }
    const updated = await updateApplicationRequiredDocumentStatusById({
      documentId,
      status: "rejected",
    });
    if (updated?.application_id) {
      const application = await findApplicationById(updated.application_id);
      if (application?.pipeline_state !== ApplicationStage.DOCUMENTS_REQUIRED) {
        await transitionPipelineState({
          applicationId: updated.application_id,
          nextState: ApplicationStage.DOCUMENTS_REQUIRED,
          actorUserId: req.user.userId,
          actorRole: req.user.role,
          trigger: "document_rejected",
          ip: req.ip,
          userAgent: req.get("user-agent"),
        });
      }
    }
    res.status(200).json({ ok: true });
  })
);

export default router;
