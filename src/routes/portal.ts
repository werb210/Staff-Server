import { Router, type Request, type Response } from "express";
import { getStatus as getStartupStatus, isReady } from "../startupState";
import { pool } from "../db";
import {
  findActiveDocumentVersion,
  findApplicationById,
  listDocumentsByApplicationId,
} from "../modules/applications/applications.repo";
import { ApplicationStage } from "../modules/applications/pipelineState";
import { safeHandler } from "../middleware/safeHandler";
import { listApplicationStages } from "../controllers/applications.controller";
import { portalRateLimit } from "../middleware/rateLimit";
import { requireAuth, requireAuthorization } from "../middleware/auth";
import { ROLES } from "../auth/roles";
import { AppError } from "../middleware/errors";
import { isPipelineState } from "../modules/applications/pipelineState";
import { transitionPipelineState } from "../modules/applications/applications.service";
import { recordAuditEvent } from "../modules/audit/audit.service";
import { advanceProcessingStage } from "../modules/applications/processingStage.service";
import {
  retryProcessingJob,
  retryProcessingJobForApplication,
} from "../modules/processing/retry.service";
import {
  assertPipelineState,
  assertPipelineTransition,
  resolveNextPipelineStage,
} from "../modules/applications/applicationLifecycle.service";
import { getAuditHistoryEnabled } from "../config";

const router = Router();
const portalLimiter = portalRateLimit();

function ensureReady(res: Response): boolean {
  if (!isReady()) {
    const status = getStartupStatus();
    res.status(503).json({
      ok: false,
      code: "service_not_ready",
      reason: status.reason,
    });
    return false;
  }
  return true;
}

function ensureAuditHistoryEnabled(): void {
  if (!getAuditHistoryEnabled()) {
    throw new AppError("not_found", "Audit history is disabled.", 404);
  }
}

function parsePagination(query: Request["query"]): { limit: number; offset: number } {
  const limitRaw = typeof query.limit === "string" ? Number(query.limit) : NaN;
  const offsetRaw = typeof query.offset === "string" ? Number(query.offset) : NaN;
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;
  const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? offsetRaw : 0;
  return { limit, offset };
}

router.get(
  "/applications",
  portalLimiter,
  safeHandler(async (_req, res) => {
    if (!ensureReady(res)) {
      return;
    }
    try {
      const result = await pool.query<{
        id: string;
        name: string;
        pipeline_state: string | null;
        created_at: Date;
      }>(
        `select id,
          coalesce(name, business_legal_name) as name,
          pipeline_state,
          created_at
         from applications
         order by created_at desc`
      );
      const rows = Array.isArray(result?.rows) ? result.rows : [];
      res.status(200).json({
        items: rows.map((row) => ({
          id: row.id,
          name: row.name,
          pipelineState: row.pipeline_state ?? ApplicationStage.RECEIVED,
          createdAt: row.created_at,
        })),
      });
    } catch (err) {
      res.status(200).json({ items: [] });
    }
  })
);

router.get(
  "/applications/stages",
  portalLimiter,
  safeHandler(async (req, res) => {
    if (!ensureReady(res)) {
      return;
    }
    await listApplicationStages(req, res);
  })
);

router.get(
  "/applications/:id",
  portalLimiter,
  safeHandler(async (req: Request, res: Response) => {
    if (!ensureReady(res)) {
      return;
    }
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
    const documents = await listDocumentsByApplicationId(record.id);
    const documentsWithVersions = await Promise.all(
      documents.map(async (doc) => {
        const version = await findActiveDocumentVersion({ documentId: doc.id });
        const metadata =
          version && version.metadata && typeof version.metadata === "object"
            ? (version.metadata as {
                fileName?: string;
                mimeType?: string;
                size?: number;
                storageKey?: string;
              })
            : {};
        return {
          documentId: doc.id,
          applicationId: doc.application_id,
          category: doc.document_type,
          title: doc.title,
          filename: metadata.fileName ?? doc.title,
          mimeType: metadata.mimeType ?? null,
          size: metadata.size ?? null,
          storageKey: metadata.storageKey ?? null,
          version: version?.version ?? null,
          createdAt: doc.created_at,
        };
      })
    );
    res.status(200).json({
      application: {
        id: record.id,
        name: record.name,
        productType: record.product_type,
        pipelineState: record.pipeline_state,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
        metadata: record.metadata ?? null,
      },
      pipeline: {
        state: record.pipeline_state,
      },
      documents: documentsWithVersions,
    });
  })
);

router.get(
  "/applications/:id/history",
  requireAuth,
  portalLimiter,
  requireAuthorization({ roles: [ROLES.ADMIN, ROLES.STAFF] }),
  safeHandler(async (req, res) => {
    ensureAuditHistoryEnabled();
    const applicationId = typeof req.params.id === "string" ? req.params.id.trim() : "";
    if (!applicationId) {
      throw new AppError("validation_error", "Application id is required.", 400);
    }
    const actorType =
      typeof req.query.actorType === "string" ? req.query.actorType.trim() : "";
    const fromStage =
      typeof req.query.fromStage === "string" ? req.query.fromStage.trim() : "";
    const toStage =
      typeof req.query.toStage === "string" ? req.query.toStage.trim() : "";
    const trigger =
      typeof req.query.trigger === "string" ? req.query.trigger.trim() : "";
    const { limit, offset } = parsePagination(req.query);
    const values: Array<string | number> = [applicationId];
    const filters: string[] = [];
    if (actorType) {
      values.push(actorType);
      filters.push(`actor_type = $${values.length}`);
    }
    if (fromStage) {
      values.push(fromStage);
      filters.push(`from_stage = $${values.length}`);
    }
    if (toStage) {
      values.push(toStage);
      filters.push(`to_stage = $${values.length}`);
    }
    if (trigger) {
      values.push(trigger);
      filters.push(`trigger = $${values.length}`);
    }
    values.push(limit, offset);
    const filterClause = filters.length > 0 ? `and ${filters.join(" and ")}` : "";
    const result = await pool.query<{
      application_id: string;
      from_stage: string | null;
      to_stage: string;
      trigger: string;
      actor_id: string | null;
      actor_role: string | null;
      actor_type: string;
      occurred_at: Date;
      reason: string | null;
    }>(
      `select application_id, from_stage, to_stage, trigger, actor_id, actor_role,
              actor_type, occurred_at, reason
       from application_pipeline_history
       where application_id = $1
       ${filterClause}
       order by occurred_at asc
       limit $${values.length - 1} offset $${values.length}`,
      values
    );
    res.status(200).json({ items: result.rows ?? [] });
  })
);

router.get(
  "/jobs/:id/history",
  requireAuth,
  portalLimiter,
  requireAuthorization({ roles: [ROLES.ADMIN, ROLES.STAFF] }),
  safeHandler(async (req, res) => {
    ensureAuditHistoryEnabled();
    const jobId = typeof req.params.id === "string" ? req.params.id.trim() : "";
    if (!jobId) {
      throw new AppError("validation_error", "Job id is required.", 400);
    }
    const jobType =
      typeof req.query.jobType === "string" ? req.query.jobType.trim() : "";
    const nextStatus =
      typeof req.query.nextStatus === "string" ? req.query.nextStatus.trim() : "";
    const actorType =
      typeof req.query.actorType === "string" ? req.query.actorType.trim() : "";
    const { limit, offset } = parsePagination(req.query);
    const values: Array<string | number> = [jobId];
    const filters: string[] = [];
    if (jobType) {
      values.push(jobType);
      filters.push(`job_type = $${values.length}`);
    }
    if (nextStatus) {
      values.push(nextStatus);
      filters.push(`next_status = $${values.length}`);
    }
    if (actorType) {
      values.push(actorType);
      filters.push(`actor_type = $${values.length}`);
    }
    values.push(limit, offset);
    const filterClause = filters.length > 0 ? `and ${filters.join(" and ")}` : "";
    const result = await pool.query<{
      job_id: string;
      job_type: string;
      application_id: string | null;
      document_id: string | null;
      previous_status: string | null;
      next_status: string;
      reason: string | null;
      retry_count: number;
      last_retry_at: Date | null;
      occurred_at: Date;
      actor_type: string;
      actor_id: string | null;
    }>(
      `select job_id, job_type, application_id, document_id, previous_status, next_status,
              reason, retry_count, last_retry_at, occurred_at, actor_type, actor_id
       from processing_job_history
       where job_id = $1
       ${filterClause}
       order by occurred_at asc
       limit $${values.length - 1} offset $${values.length}`,
      values
    );
    res.status(200).json({ items: result.rows ?? [] });
  })
);

router.get(
  "/documents/:id/history",
  requireAuth,
  portalLimiter,
  requireAuthorization({ roles: [ROLES.ADMIN, ROLES.STAFF] }),
  safeHandler(async (req, res) => {
    ensureAuditHistoryEnabled();
    const documentId = typeof req.params.id === "string" ? req.params.id.trim() : "";
    if (!documentId) {
      throw new AppError("validation_error", "Document id is required.", 400);
    }
    const nextStatus =
      typeof req.query.nextStatus === "string" ? req.query.nextStatus.trim() : "";
    const actorType =
      typeof req.query.actorType === "string" ? req.query.actorType.trim() : "";
    const { limit, offset } = parsePagination(req.query);
    const values: Array<string | number> = [documentId];
    const filters: string[] = [];
    if (nextStatus) {
      values.push(nextStatus);
      filters.push(`next_status = $${values.length}`);
    }
    if (actorType) {
      values.push(actorType);
      filters.push(`actor_type = $${values.length}`);
    }
    values.push(limit, offset);
    const filterClause = filters.length > 0 ? `and ${filters.join(" and ")}` : "";
    const result = await pool.query<{
      application_id: string;
      document_id: string;
      document_type: string;
      actor_id: string | null;
      actor_role: string | null;
      actor_type: string;
      previous_status: string | null;
      next_status: string;
      reason: string | null;
      occurred_at: Date;
    }>(
      `select application_id, document_id, document_type, actor_id, actor_role, actor_type,
              previous_status, next_status, reason, occurred_at
       from document_status_history
       where document_id = $1
       ${filterClause}
       order by occurred_at asc
       limit $${values.length - 1} offset $${values.length}`,
      values
    );
    res.status(200).json({ items: result.rows ?? [] });
  })
);

router.post(
  "/jobs/:id/retry",
  requireAuth,
  portalLimiter,
  requireAuthorization({ roles: [ROLES.ADMIN] }),
  safeHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError("missing_token", "Authorization token is required.", 401);
    }
    const jobId = typeof req.params.id === "string" ? req.params.id.trim() : "";
    if (!jobId) {
      throw new AppError("validation_error", "Job id is required.", 400);
    }
    const reason =
      typeof req.body?.reason === "string" ? req.body.reason.trim() : null;
    const job = await retryProcessingJob({
      jobId,
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      reason,
      force: true,
      ip: req.ip ?? null,
      userAgent: req.get("user-agent") ?? null,
    });
    res.status(200).json({ job });
  })
);

router.post(
  "/applications/:id/retry-job",
  requireAuth,
  portalLimiter,
  requireAuthorization({ roles: [ROLES.ADMIN] }),
  safeHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError("missing_token", "Authorization token is required.", 401);
    }
    const applicationId = typeof req.params.id === "string" ? req.params.id.trim() : "";
    if (!applicationId) {
      throw new AppError("validation_error", "Application id is required.", 400);
    }
    const reason =
      typeof req.body?.reason === "string" ? req.body.reason.trim() : null;
    const job = await retryProcessingJobForApplication({
      applicationId,
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      reason,
      ip: req.ip ?? null,
      userAgent: req.get("user-agent") ?? null,
    });
    res.status(200).json({ job });
  })
);

router.post(
  "/applications/:id/promote",
  requireAuth,
  portalLimiter,
  requireAuthorization({ roles: [ROLES.ADMIN] }),
  safeHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError("missing_token", "Authorization token is required.", 401);
    }
    const applicationId = typeof req.params.id === "string" ? req.params.id.trim() : "";
    if (!applicationId) {
      throw new AppError("validation_error", "Application id is required.", 400);
    }
    const reason =
      typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    if (!reason) {
      throw new AppError("validation_error", "Reason is required.", 400);
    }
    const nextStageRaw =
      typeof req.body?.nextStage === "string" ? req.body.nextStage.trim() : "";
    if (nextStageRaw && !isPipelineState(nextStageRaw)) {
      throw new AppError("validation_error", "nextStage is invalid.", 400);
    }
    const record = await findApplicationById(applicationId);
    if (!record) {
      throw new AppError("not_found", "Application not found.", 404);
    }
    const currentStage = assertPipelineState(record.pipeline_state);
    const nextStage = nextStageRaw && isPipelineState(nextStageRaw)
      ? nextStageRaw
      : resolveNextPipelineStage(currentStage);
    if (!nextStage) {
      throw new AppError("invalid_transition", "No valid next stage.", 400);
    }
    const transition = assertPipelineTransition({
      currentStage,
      nextStage,
      status: record.status,
    });
    if (!transition.shouldTransition) {
      res.status(200).json({ ok: true, applicationId, nextStage });
      return;
    }
    await transitionPipelineState({
      applicationId,
      nextState: nextStage,
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      trigger: "admin_promotion",
      reason,
      ip: req.ip ?? null,
      userAgent: req.get("user-agent") ?? null,
    });
    await recordAuditEvent({
      action: "application_promoted",
      actorUserId: req.user.userId,
      targetUserId: record.owner_user_id,
      targetType: "application",
      targetId: applicationId,
      ip: req.ip ?? null,
      userAgent: req.get("user-agent") ?? null,
      success: true,
      metadata: {
        from: record.pipeline_state,
        to: nextStage,
        reason,
      },
    });
    await advanceProcessingStage({ applicationId });
    res.status(200).json({ ok: true, applicationId, nextStage });
  })
);

export default router;
