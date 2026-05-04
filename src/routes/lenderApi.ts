// BF_SERVER_BLOCK_v107_LENDER_API_KEYS_v1
import { Router } from "express";
import { z } from "zod";
import crypto from "node:crypto";
import { AppError } from "../middleware/errors.js";
import { pool } from "../db.js";

const router = Router();

async function authenticate(req: any): Promise<{ lenderId: string; keyId: string }> {
  const hdr = String(req.get("authorization") || "");
  const m = hdr.match(/^Bearer\s+(lk_[A-Za-z0-9]+)\.([A-Za-z0-9]+)$/);
  if (!m) throw new AppError("missing_token", "Bearer lk_*.* required.", 401);
  const prefix = m[1]; const secret = m[2];
  const { rows } = await pool.query(
    `SELECT id, lender_id, key_hash, scopes, rate_limit_per_min, revoked_at
       FROM lender_api_keys WHERE key_prefix = $1`, [prefix]
  );
  const row = rows[0];
  if (!row || row.revoked_at) throw new AppError("invalid_token", "Invalid API key.", 401);
  const expected = crypto.createHash("sha256").update(prefix + "." + secret).digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(row.key_hash))) {
    throw new AppError("invalid_token", "Invalid API key.", 401);
  }
  pool.query(`UPDATE lender_api_keys SET last_used_at = NOW() WHERE id = $1`, [row.id]).catch(() => {});
  return { lenderId: row.lender_id, keyId: row.id };
}

router.get("/me", async (req: any, res: any, next: any) => {
  try {
    const { lenderId, keyId } = await authenticate(req);
    const { rows } = await pool.query(`SELECT id, name, country, status FROM lenders WHERE id = $1`, [lenderId]);
    res.json({ key_id: keyId, lender: rows[0] ?? null });
  } catch (err) { next(err); }
});

const createAppSchema = z.object({
  business_name: z.string().min(1),
  contact_name: z.string().optional(),
  contact_email: z.string().email(),
  contact_phone: z.string().optional(),
  loan_amount: z.number().positive(),
  product_id: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional(),
});

router.post("/v1/applications", async (req: any, res: any, next: any) => {
  try {
    const { lenderId } = await authenticate(req);
    const input = createAppSchema.parse(req.body);
    const { rows } = await pool.query(
      `INSERT INTO applications
         (lender_id, business_name, contact_name, contact_email, contact_phone,
          loan_amount, product_id, status, source, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'received', 'lender_api', NOW(), NOW())
       RETURNING id, status, created_at`,
      [lenderId, input.business_name, input.contact_name ?? null, input.contact_email,
       input.contact_phone ?? null, input.loan_amount, input.product_id ?? null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err && typeof err === "object" && "name" in err && (err as any).name === "ZodError") {
      return res.status(400).json({ code: "validation_error", errors: (err as any).errors });
    }
    next(err);
  }
});

router.get("/v1/applications/:id", async (req: any, res: any, next: any) => {
  try {
    const { lenderId } = await authenticate(req);
    const id = String(req.params.id || "");
    const { rows } = await pool.query(
      `SELECT id, status, business_name, contact_name, contact_email,
              loan_amount, created_at, updated_at
         FROM applications
        WHERE id = $1 AND lender_id = $2`,
      [id, lenderId]
    );
    if (rows.length === 0) throw new AppError("not_found", "Not found.", 404);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

export default router;
