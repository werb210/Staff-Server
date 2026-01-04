import { Router } from "express";
import { AppError } from "../../middleware/errors";
import {
  changePipelineState,
  createApplicationForUser,
  uploadDocument,
} from "./applications.service";
import { requireAuth, requireCapability } from "../../middleware/auth";
import { CAPABILITIES } from "../../auth/capabilities";

const router = Router();

router.post(
  "/",
  requireAuth,
  requireCapability([CAPABILITIES.APPLICATION_CREATE]),
  async (req, res, next) => {
    try {
      const { name, metadata } = req.body ?? {};
      if (!req.user) {
        throw new AppError("missing_token", "Authorization token is required.", 401);
      }
      if (!name || typeof name !== "string") {
        throw new AppError("missing_fields", "Name is required.", 400);
      }
      const application = await createApplicationForUser({
        ownerUserId: req.user.userId,
        name,
        metadata: metadata ?? null,
        actorUserId: req.user.userId,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });
      res.status(201).json({ application });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/:id/documents",
  requireAuth,
  requireCapability([CAPABILITIES.DOCUMENT_UPLOAD]),
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError("missing_token", "Authorization token is required.", 401);
      }
      const { title, metadata, content, documentId } = req.body ?? {};
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
        metadata,
        content,
        actorUserId: req.user.userId,
        actorRole: req.user.role,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });
      res.status(201).json({ document: result });
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

export default router;
