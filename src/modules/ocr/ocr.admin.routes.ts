import { Router, Request, Response, NextFunction } from "express";
import { AppError } from "../../middleware/errors";
import { recordAuditEvent } from "../audit/audit.service";
import {
  enqueueOcrForApplication,
  enqueueOcrForDocument,
  getOcrJobStatus,
  getOcrResult,
  retryOcrJob,
} from "./ocr.service";

const router = Router();

router.post(
  "/documents/:documentId/enqueue",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const job = await enqueueOcrForDocument(req.params.documentId);
      await recordAuditEvent({
        action: "ocr_job_enqueued",
        actorUserId: req.user?.userId ?? null,
        targetUserId: null,
        targetType: "ocr_job",
        targetId: job.id,
        ip: req.ip,
        userAgent: req.get("user-agent"),
        success: true,
      });
      res.status(202).json({ job });
    } catch (err) {
      await recordAuditEvent({
        action: "ocr_job_enqueued",
        actorUserId: req.user?.userId ?? null,
        targetUserId: null,
        targetType: "ocr_job",
        targetId: req.params.documentId,
        ip: req.ip,
        userAgent: req.get("user-agent"),
        success: false,
      });
      next(err);
    }
  }
);

router.post(
  "/applications/:applicationId/enqueue",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const jobs = await enqueueOcrForApplication(req.params.applicationId);
      await recordAuditEvent({
        action: "ocr_application_enqueued",
        actorUserId: req.user?.userId ?? null,
        targetUserId: null,
        targetType: "application",
        targetId: req.params.applicationId,
        ip: req.ip,
        userAgent: req.get("user-agent"),
        success: true,
      });
      res.status(202).json({ jobs });
    } catch (err) {
      await recordAuditEvent({
        action: "ocr_application_enqueued",
        actorUserId: req.user?.userId ?? null,
        targetUserId: null,
        targetType: "application",
        targetId: req.params.applicationId,
        ip: req.ip,
        userAgent: req.get("user-agent"),
        success: false,
      });
      next(err);
    }
  }
);

router.get(
  "/documents/:documentId/status",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const job = await getOcrJobStatus(req.params.documentId);
      if (!job) {
        throw new AppError("not_found", "OCR job not found.", 404);
      }
      await recordAuditEvent({
        action: "ocr_job_status_viewed",
        actorUserId: req.user?.userId ?? null,
        targetUserId: null,
        targetType: "ocr_job",
        targetId: job.id,
        ip: req.ip,
        userAgent: req.get("user-agent"),
        success: true,
      });
      res.json({ job });
    } catch (err) {
      await recordAuditEvent({
        action: "ocr_job_status_viewed",
        actorUserId: req.user?.userId ?? null,
        targetUserId: null,
        targetType: "ocr_job",
        targetId: req.params.documentId,
        ip: req.ip,
        userAgent: req.get("user-agent"),
        success: false,
      });
      next(err);
    }
  }
);

router.get(
  "/documents/:documentId/result",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await getOcrResult(req.params.documentId);
      if (!result) {
        throw new AppError("not_found", "OCR result not found.", 404);
      }
      await recordAuditEvent({
        action: "ocr_result_viewed",
        actorUserId: req.user?.userId ?? null,
        targetUserId: null,
        targetType: "ocr_result",
        targetId: result.id,
        ip: req.ip,
        userAgent: req.get("user-agent"),
        success: true,
      });
      res.json({ result });
    } catch (err) {
      await recordAuditEvent({
        action: "ocr_result_viewed",
        actorUserId: req.user?.userId ?? null,
        targetUserId: null,
        targetType: "ocr_result",
        targetId: req.params.documentId,
        ip: req.ip,
        userAgent: req.get("user-agent"),
        success: false,
      });
      next(err);
    }
  }
);

router.post(
  "/documents/:documentId/retry",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const job = await retryOcrJob(req.params.documentId);
      await recordAuditEvent({
        action: "ocr_job_retried",
        actorUserId: req.user?.userId ?? null,
        targetUserId: null,
        targetType: "ocr_job",
        targetId: job.id,
        ip: req.ip,
        userAgent: req.get("user-agent"),
        success: true,
      });
      res.status(202).json({ job });
    } catch (err) {
      await recordAuditEvent({
        action: "ocr_job_retried",
        actorUserId: req.user?.userId ?? null,
        targetUserId: null,
        targetType: "ocr_job",
        targetId: req.params.documentId,
        ip: req.ip,
        userAgent: req.get("user-agent"),
        success: false,
      });
      next(err);
    }
  }
);

export default router;
