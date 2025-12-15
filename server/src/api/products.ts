import { Router } from "express";
import { db } from "../db";
import { lenderProducts, productQuestions, productRequiredDocs } from "../db/schema";
import { authenticate } from "../middleware/authMiddleware";
import { eq } from "drizzle-orm";

const router = Router();

router.use(authenticate);

router.get("/", async (_req, res, next) => {
  try {
    const products = await db.select().from(lenderProducts);
    res.json(products);
  } catch (err) {
    next(err);
  }
});

router.get("/:id/requirements", async (req, res, next) => {
  try {
    const [product] = await db.select().from(lenderProducts).where(eq(lenderProducts.id, req.params.id)).limit(1);
    if (!product) return res.status(404).json({ error: "Product not found" });
    const docs = await db.select().from(productRequiredDocs).where(eq(productRequiredDocs.lenderProductId, product.id));
    const questions = await db.select().from(productQuestions).where(eq(productQuestions.lenderProductId, product.id));
    res.json({ product, requiredDocuments: docs, questions });
  } catch (err) {
    next(err);
  }
});

export default router;
