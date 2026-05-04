// BF_SERVER_BLOCK_v107_LENDER_API_KEYS_v1
import { Router } from "express";
import crypto from "node:crypto";
import { requireAuth, requireAuthorization } from "../middleware/auth.js";
import { ROLES } from "../auth/roles.js";
import { AppError } from "../middleware/errors.js";
import { pool } from "../db.js";

const router = Router();

function genKey(): { prefix: string; secret: string; hash: string } {
  const prefix = "lk_" + crypto.randomBytes(8).toString("hex");
  const secret = crypto.randomBytes(24).toString("hex");
  const hash = crypto.createHash("sha256").update(prefix + "." + secret).digest("hex");
  return { prefix, secret, hash };
}

router.get(
  "/lenders/:lenderId/api-keys",
  requireAuth,
  requireAuthorization({ roles: [ROLES.ADMIN] }),
  async (req: any, res: any, next: any) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, key_prefix, scopes, rate_limit_per_min, last_used_at,
                revoked_at, created_at
           FROM lender_api_keys
          WHERE lender_id = $1
          ORDER BY created_at DESC`,
        [req.params.lenderId]
      );
      res.json({ items: rows });
    } catch (err) { next(err); }
  }
);

router.post(
  "/lenders/:lenderId/api-keys",
  requireAuth,
  requireAuthorization({ roles: [ROLES.ADMIN] }),
  async (req: any, res: any, next: any) => {
    try {
      const lenderId = req.params.lenderId;
      const check = await pool.query(`SELECT id FROM lenders WHERE id = $1`, [lenderId]);
      if (check.rowCount === 0) throw new AppError("not_found", "Lender not found.", 404);
      const { prefix, secret, hash } = genKey();
      const { rows } = await pool.query(
        `INSERT INTO lender_api_keys (lender_id, key_prefix, key_hash, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING id, key_prefix, scopes, rate_limit_per_min, created_at`,
        [lenderId, prefix, hash, req.user?.userId ?? null]
      );
      res.status(201).json({ ...rows[0], secret: `${prefix}.${secret}` });
    } catch (err) { next(err); }
  }
);

router.post(
  "/lenders/:lenderId/api-keys/:keyId/revoke",
  requireAuth,
  requireAuthorization({ roles: [ROLES.ADMIN] }),
  async (req: any, res: any, next: any) => {
    try {
      await pool.query(
        `UPDATE lender_api_keys SET revoked_at = NOW()
          WHERE id = $1 AND lender_id = $2 AND revoked_at IS NULL`,
        [req.params.keyId, req.params.lenderId]
      );
      res.json({ ok: true });
    } catch (err) { next(err); }
  }
);

export default router;
