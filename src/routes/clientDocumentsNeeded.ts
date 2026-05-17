// BF_SERVER_BLOCK_53_v1 -- mini-portal DocPicker backing endpoint.
// Returns the list of docs the client still needs to upload, broken
// into two buckets: rejected re-uploads and still-needed required
// docs. The mini-portal DocPicker iterates both lists.
//
// "Required" = lender_products_required_docs for the application's
// matched lender product. If the app has no matched product yet, we
// fall back to a sensible default required-doc list (3yr financials,
// 3yr tax returns, 6mo banking, photo ID).
import { Router, type Request, type Response } from "express";
import { pool } from "../db.js";

const router = Router();

const FALLBACK_REQUIRED = [
  { document_type: "government_id", label: "Government-issued ID" },
  { document_type: "financials_3yr", label: "3 years accountant-prepared financials" },
  { document_type: "tax_returns_3yr", label: "3 years business tax returns" },
  { document_type: "bank_statements_6mo", label: "6 months business banking statements" },
];

router.get("/needed", async (req: Request, res: Response) => {
  const applicationId = typeof req.query.applicationId === "string" ? req.query.applicationId.trim() : "";
  if (!applicationId) return res.status(400).json({ error: "applicationId is required" });

  try {
    // What's been uploaded and its status.
    const uploadedRes = await pool.query<{ document_type: string | null; status: string | null }>(
      `SELECT document_type, status FROM documents WHERE application_id = $1`,
      [applicationId]
    ).catch(() => ({ rows: [] as any[] }));
    const uploaded = uploadedRes.rows;
    const approvedTypes = new Set(uploaded.filter((r) => r.status === "approved").map((r) => r.document_type ?? ""));
    const rejected = uploaded.filter((r) => r.status === "rejected" && r.document_type);

    // Required for matched lender product, fallback to defaults.
    let required: { document_type: string; label: string }[] = [];
    try {
      const appRow = await pool.query<{ lender_product_id: string | null }>(
        `SELECT lender_product_id FROM applications WHERE id = $1 LIMIT 1`,
        [applicationId]
      );
      const productId = appRow.rows[0]?.lender_product_id ?? null;
      if (productId) {
        const reqRes = await pool.query<{ document_type: string; label: string | null }>(
          `SELECT document_type, label FROM lender_products_required_docs WHERE lender_product_id = $1`,
          [productId]
        ).catch(() => ({ rows: [] as any[] }));
        required = reqRes.rows.map((r) => ({ document_type: r.document_type, label: r.label || r.document_type }));
      }
    } catch {
      /* fall through to defaults */
    }
    if (required.length === 0) required = FALLBACK_REQUIRED;

    const stillNeeded = required.filter((r) => !approvedTypes.has(r.document_type));

    return res.status(200).json({
      stillNeeded,
      rejected: rejected.map((r) => ({ document_type: r.document_type, label: r.document_type })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "needed_docs_failed" });
  }
});

export default router;
