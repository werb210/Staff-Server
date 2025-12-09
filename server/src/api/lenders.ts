import { Router } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { lenderProducts, lenderRequiredDocuments, requiredDocMap } from "../db/schema";
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

const requiredDocSchema = z.object({
  lenderProductId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().default("general"),
  isMandatory: z.boolean().default(true),
});

router.get("/required-documents", async (req, res, next) => {
  try {
    const lenderProductId = req.query.lenderProductId as string | undefined;
    const query = db.select().from(lenderRequiredDocuments);
    const docs = lenderProductId
      ? await query.where(eq(lenderRequiredDocuments.lenderProductId, lenderProductId))
      : await query;
    res.json(docs);
  } catch (err) {
    next(err);
  }
});

router.post("/required-documents", async (req, res, next) => {
  try {
    const parsed = requiredDocSchema.parse(req.body);
    const [created] = await db.insert(lenderRequiredDocuments).values(parsed).returning();
    await db
      .insert(requiredDocMap)
      .values({ lenderProductId: parsed.lenderProductId, requiredDocumentId: created.id, isRequired: true });
    res.status(201).json(created);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.errors });
    }
    next(err);
  }
});

router.delete("/required-documents/:id", async (req, res, next) => {
  try {
    await db
      .update(requiredDocMap)
      .set({ isRequired: false })
      .where(eq(requiredDocMap.requiredDocumentId, req.params.id));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
