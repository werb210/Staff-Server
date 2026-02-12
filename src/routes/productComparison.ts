import { Router } from "express";

type ProductInput = {
  name: string;
  factorRate?: number;
  apr?: number;
  maxAmount?: number;
  minCreditScore?: number;
};

const router = Router();

router.post("/", async (req, res) => {
  const { products } = req.body as { products?: ProductInput[] };

  if (!Array.isArray(products) || products.length < 2) {
    res.status(400).json({ code: "invalid_request", message: "At least 2 products are required" });
    return;
  }

  const ranked = [...products].sort((a, b) => {
    const aCost = a.apr ?? a.factorRate ?? Number.POSITIVE_INFINITY;
    const bCost = b.apr ?? b.factorRate ?? Number.POSITIVE_INFINITY;
    if (aCost !== bCost) {
      return aCost - bCost;
    }
    return (b.maxAmount ?? 0) - (a.maxAmount ?? 0);
  });

  res.json({
    best: ranked[0],
    ranking: ranked,
  });
});

export default router;
