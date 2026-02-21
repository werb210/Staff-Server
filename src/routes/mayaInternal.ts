import { Router } from "express";
import { db } from "../db";
import { requireMayaToken } from "../middleware/mayaInternalAuth";
import { safeHandler } from "../middleware/safeHandler";

const router = Router();

router.use(requireMayaToken);

/**
 * Pipeline summary
 */
router.get(
  "/pipeline",
  safeHandler(async (_req, res) => {
    const result = await db.query(`
      SELECT status, COUNT(*)::int as count
      FROM applications
      GROUP BY status
    `);

    res.json(result.rows);
  })
);

/**
 * Application lookup
 */
router.get(
  "/application/:identifier",
  safeHandler(async (req, res) => {
    const { identifier } = req.params;

    const result = await db.query(
      `
      SELECT id, status, product_type, created_at
      FROM applications
      WHERE phone = $1 OR email = $1
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [identifier]
    );

    res.json(result.rows[0] || null);
  })
);

/**
 * Lender product ranges
 */
router.get(
  "/products/:type",
  safeHandler(async (req, res) => {
    const { type } = req.params;

    const result = await db.query(
      `
      SELECT lender_name, min_rate, max_rate
      FROM lender_products
      WHERE product_type = $1
        AND is_active = true
      `,
      [type]
    );

    res.json(result.rows);
  })
);

export default router;
