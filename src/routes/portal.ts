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

const router = Router();

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

router.get(
  "/applications",
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
  "/applications/:id",
  safeHandler(async (req: Request, res: Response) => {
    if (!ensureReady(res)) {
      return;
    }
    const record = await findApplicationById(req.params.id);
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

export default router;
