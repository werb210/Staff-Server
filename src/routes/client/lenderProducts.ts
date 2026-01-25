import { Router } from "express";
import { pool } from "../../db";

const router = Router();

/**
 * GET /api/client/lender-products
 * Public, ACTIVE lenders + ACTIVE products only
 */
router.get("/", async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT
        lp.id,
        lp.name,
        lp.product_type,
        lp.min_amount,
        lp.max_amount,
        l.id AS lender_id,
        l.name AS lender_name
      FROM lender_products lp
      JOIN lenders l ON l.id = lp.lender_id
      WHERE lp.status = 'active'
        AND l.status = 'active'
      ORDER BY l.name, lp.name
      `
    );

    res.json({ ok: true, data: rows });
  } catch (err) {
    next(err);
  }
});

export default router;
