// BF_SERVER_BLOCK_v81_CLIENT_LENDER_PRODUCTS — accept ?category=<X> filter.
// BF_SERVER_BLOCK_v83_LENDER_PRODUCTS_STATUS_FIELD_v1 — also expose active
// as status:'active'|'inactive' so clients that filter by status work.
import { Router } from "express";
import { pool } from "../../db.js";
import { ok, fail } from "../../middleware/response.js";

const router = Router();

router.get("/lender-products", async (req, res) => {
  try {
    const category = typeof req.query.category === "string"
      ? req.query.category.trim().toUpperCase()
      : "";
    const params: unknown[] = [];
    let where = "active = true";
    if (category) {
      params.push(category);
      where += ` AND category = $${params.length}`;
    }
    const r = await pool.query(
      `SELECT id, lender_id, name, category, country, rate_type,
              interest_min, interest_max, term_min, term_max, term_unit,
              amount_min, amount_max, required_documents,
              CASE WHEN active THEN 'active' ELSE 'inactive' END AS status,
              active
       FROM lender_products
       WHERE ${where}
       ORDER BY category, name
       LIMIT 500`,
      params
    );
    return ok(res, r.rows);
  } catch (err) {
    console.error("[client/lender-products] failed", err);
    return fail(res, 500, "FAILED");
  }
});

export default router;
