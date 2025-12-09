import { Router } from "express";
import { db } from "../db/client";
import { lenderProducts } from "../db/schema";
import { authenticate } from "../middleware/authMiddleware";

const router = Router();

router.use(authenticate);

router.get("/products", async (_req, res, next) => {
  try {
    const products = await db.select().from(lenderProducts);
    res.json(products);
  } catch (err) {
    next(err);
  }
});

router.post("/products", async (req, res, next) => {
  try {
    const { lenderName, productName, productType, minAmount, maxAmount } = req.body;
    if (!lenderName || !productName || !productType) {
      return res.status(400).json({ error: "lenderName, productName and productType are required" });
    }
    const [created] = await db
      .insert(lenderProducts)
      .values({ lenderName, productName, productType, minAmount, maxAmount })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

export default router;
