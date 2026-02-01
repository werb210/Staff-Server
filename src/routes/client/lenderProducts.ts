import { Router } from "express";
import { pool } from "../../db";
import { listClientLenderProductRequirementsHandler } from "../../controllers/lenderProductRequirements.controller";

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
        lp.category,
        lp.term_min,
        lp.term_max,
        lp.country
      FROM lender_products lp
      LEFT JOIN lenders l ON l.id = lp.lender_id
      WHERE lp.active = true
        AND l.active = true
      ORDER BY lp.name
      `
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/client/lender-products/:id/requirements
 * Public, ACTIVE products only
 */
router.get("/:id/requirements", async (req, res, next) => {
  try {
    await listClientLenderProductRequirementsHandler(req, res);
  } catch (err) {
    next(err);
  }
});

export default router;
