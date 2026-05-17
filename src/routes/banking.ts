import { Router } from "express";
import rateLimit from "express-rate-limit";
import { AppError } from "../middleware/errors.js";
import { safeHandler } from "../middleware/safeHandler.js";
// BF_SERVER_BLOCK_55_GATE_AND_BANKING_TRIGGER_v1 — manual banking-analysis trigger.
import { runBankingAnalysis } from "../services/banking/bankingAnalysisPipeline.js";
import { getStorage } from "../lib/storage/index.js";
import { pool as bankingPool } from "../db.js";
import { requireAuth, requireAuthorization } from "../middleware/auth.js";
import { ROLES } from "../auth/roles.js";
import { safeKeyGenerator } from "../middleware/rateLimit.js";
import { config } from "../config/index.js";

const router = Router();

// BF_SERVER_BLOCK_55_GATE_AND_BANKING_TRIGGER_v1
// Manual banking-analysis trigger. bankingAutoWorker polls for documents
// where signed_category/document_type LIKE '%bank%'. If staff uploaded
// statements under a non-bank category (or the documents have nulls in
// those fields), auto-trigger never fires and the Banking Analysis tab
// stays empty even though OCR completed for all 20 docs. This endpoint
// runs the pipeline directly against ALL OCR-complete docs on the
// application, regardless of category tag.
router.post(
  "/applications/:id/banking-analysis/run",
  requireAuth,
  requireAuthorization({ roles: [ROLES.ADMIN, ROLES.STAFF] }),
  async (req, res) => {
    const id = String(req.params.id ?? "").trim();
    if (!id) return res.status(400).json({ error: "missing_application_id" });

    const ocrCount = await bankingPool
      .query<{ n: string }>(
        `SELECT COUNT(*)::text AS n FROM documents
          WHERE application_id::text = $1 AND ocr_status = 'completed' AND deleted_at IS NULL`,
        [id]
      )
      .catch(() => ({ rows: [{ n: "0" }] as Array<{ n: string }> }));
    const n = Number(ocrCount.rows[0]?.n ?? "0");
    if (n === 0) return res.status(409).json({ error: "no_ocr_complete_documents" });

    async function fetchBuffer(storageKey: string): Promise<Buffer> {
      const got = await getStorage().get(storageKey);
      if (!got) throw new Error(`storage_object_missing:${storageKey}`);
      return got.buffer;
    }

    try {
      const result = await runBankingAnalysis(id, { fetchBuffer });
      await bankingPool
        .query(
          `UPDATE documents SET banking_status = 'completed', updated_at = NOW()
             WHERE application_id::text = ($1)::text AND ocr_status = 'completed'`,
          [id]
        )
        .catch(() => {});
      return res.json({ ok: true, triggered: "manual", documents_considered: n, result });
    } catch (e) {
      return res.status(500).json({ error: "banking_analysis_failed", message: e instanceof Error ? e.message : String(e) });
    }
  }
);

// BF_SERVER_BLOCK_v335_AUTH_HARDENING_AND_DEAD_CODE_v1 -- Edit 1
// Pre-fix POST /api/banking/analysis was COMPLETELY UNAUTHENTICATED. Any
// internet caller could hit it with an arbitrary transactions[] payload
// and get back computed analysis values keyed by an arbitrary
// applicationId. Two real consumers: BF-portal's BankingTab and
// BankingAnalysisTab (staff drawer/tab UIs at applications/drawer/tab-
// banking and applications/tabs/BankingAnalysisTab). Both call from
// staff sessions which already have a Bearer JWT. Adding requireAuth +
// requireAuthorization for ADMIN/STAFF matches every other staff-side
// analysis endpoint. Also adding a 30 req/min/IP limiter -- the handler
// iterates transactions[] arrays which can be sent oversized to burn
// CPU, even from authenticated callers.
const bankingAnalysisLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    xForwardedForHeader: false,
    trustProxy: false,
  },
  skip: () => config.env === "test",
  keyGenerator: safeKeyGenerator,
});

router.post(
  "/analysis",
  requireAuth,
  requireAuthorization({ roles: [ROLES.ADMIN, ROLES.STAFF] }),
  bankingAnalysisLimiter,
  safeHandler(async (req: any, res: any, next: any) => {
    const applicationId = typeof req.body?.applicationId === "string" ? req.body.applicationId.trim() : "";
    if (!applicationId) {
      throw new AppError("validation_error", "applicationId is required.", 400);
    }

    const transactions = Array.isArray(req.body?.transactions) ? req.body.transactions : [];
    const balances = transactions
      .map((t: any) => Number(t?.balance))
      .filter((n: number) => Number.isFinite(n));
    const deposits = transactions
      .map((t: any) => Number(t?.credit))
      .filter((n: number) => Number.isFinite(n) && n > 0);
    const nsfCount = transactions.filter((t: any) => String(t?.type ?? "").toLowerCase().includes("nsf")).length;

    const avgBalance = balances.length ? balances.reduce((a: number, b: number) => a + b, 0) / balances.length : 0;
    const monthlyRevenue = deposits.reduce((a: number, b: number) => a + b, 0);

    const midpoint = Math.floor(deposits.length / 2) || 1;
    const firstHalf = deposits.slice(0, midpoint).reduce((a: number, b: number) => a + b, 0);
    const secondHalf = deposits.slice(midpoint).reduce((a: number, b: number) => a + b, 0);
    const revenueTrend = secondHalf >= firstHalf ? "up" : "down";

    res.status(200).json({
      applicationId,
      avg_balance: Number(avgBalance.toFixed(2)),
      nsf_count: nsfCount,
      monthly_revenue: Number(monthlyRevenue.toFixed(2)),
      revenue_trend: revenueTrend,
    });
  })
);

export default router;
