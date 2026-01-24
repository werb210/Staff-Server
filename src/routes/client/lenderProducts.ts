import { Router } from "express";
import { pool } from "../../db";

type LenderProductRow = {
  id: string;
  lender_id: string;
  product_type: string;
  min_amount: number | null;
  max_amount: number | null;
  countries: string[] | null;
  interest_rate: number | null;
  term_months: number | null;
};

const router = Router();

router.get("/", async (_req, res) => {
  const { rows } = await pool.query<LenderProductRow>(
    `
    SELECT
      id,
      lender_id,
      product_type,
      min_amount,
      max_amount,
      countries,
      interest_rate,
      term_months
    FROM lender_products
    WHERE active = true
    ORDER BY created_at DESC
    `
  );

  res.json(rows);
});

export default router;
