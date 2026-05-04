// BF_SERVER_BLOCK_v106_LENDER_PORTAL_BACKEND_v1
// Lender-scoped read endpoints. The user must be authenticated AND have
// role==='Lender' AND a non-null users.lender_id. Each query is bound to
// that lender_id so no cross-tenant leakage is possible at the API layer.

import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/errors.js";
import { pool } from "../db.js";

const router = Router();

function requireLender(req: any) {
  const role = req.user?.role;
  const lenderId = req.user?.lenderId ?? req.user?.lender_id;
  if (role !== "Lender") throw new AppError("forbidden", "Lender role required.", 403);
  if (!lenderId) throw new AppError("forbidden", "Lender id missing on token.", 403);
  return String(lenderId);
}

router.get("/me", requireAuth, async (req: any, res: any, next: any) => {
  try {
    const lenderId = requireLender(req);
    const { rows } = await pool.query(
      `SELECT l.id, l.name, l.country, l.status, l.email
         FROM lenders l
        WHERE l.id = $1`,
      [lenderId]
    );
    res.json({ user: { id: req.user.userId, role: "Lender", lenderId }, lender: rows[0] ?? null });
  } catch (err) { next(err); }
});

router.get("/applications", requireAuth, async (req: any, res: any, next: any) => {
  try {
    const lenderId = requireLender(req);
    const { rows } = await pool.query(
      `SELECT id, status, created_at, updated_at,
              business_name, contact_name, contact_email,
              loan_amount, product_id
         FROM applications
        WHERE lender_id = $1
        ORDER BY created_at DESC
        LIMIT 200`,
      [lenderId]
    ).catch(() => ({ rows: [] }));
    res.json({ items: rows });
  } catch (err) { next(err); }
});

router.get("/applications/:id", requireAuth, async (req: any, res: any, next: any) => {
  try {
    const lenderId = requireLender(req);
    const id = String(req.params.id || "").trim();
    if (!id) throw new AppError("validation_error", "id required", 400);
    const { rows } = await pool.query(
      `SELECT * FROM applications WHERE id = $1 AND lender_id = $2`,
      [id, lenderId]
    );
    if (rows.length === 0) throw new AppError("not_found", "Application not found.", 404);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.get("/products", requireAuth, async (req: any, res: any, next: any) => {
  try {
    const lenderId = requireLender(req);
    const { rows } = await pool.query(
      `SELECT id, name, type, status, created_at
         FROM lender_products
        WHERE lender_id = $1
        ORDER BY name ASC`,
      [lenderId]
    ).catch(() => ({ rows: [] }));
    res.json({ items: rows });
  } catch (err) { next(err); }
});

export default router;
