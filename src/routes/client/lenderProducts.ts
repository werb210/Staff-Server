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
        lp.type,
        lp.min_amount,
        lp.max_amount
      FROM lender_products lp
      WHERE lp.status = 'active'
      ORDER BY lp.name
      `
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

export default router;
