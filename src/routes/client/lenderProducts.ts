import { Router } from "express";
import { db } from "../../db";

const router = Router();

router.get("/", async (_req, res) => {
  const products = await db.lenderProducts.findMany({
    where: { active: true },
    select: {
      id: true,
      lender_id: true,
      product_type: true,
      min_amount: true,
      max_amount: true,
      countries: true,
      interest_rate: true,
      term_months: true,
    },
  });

  res.json(products);
});

export default router;
