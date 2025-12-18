import { Router } from "express";
import { db } from "../db";
import { lenderRequiredDocuments } from "../db/schema";
import { authenticate } from "../middleware/authMiddleware";

const router = Router();
router.use(authenticate);

router.post("/required-documents", async (req, res, next) => {
  try {
    const parsed = req.body;

    if (!parsed.lenderProductId || !parsed.docCategory) {
      throw new Error("lenderProductId and docCategory are required");
    }

    const values = {
      lenderProductId: parsed.lenderProductId!,
      docCategory: parsed.docCategory!,
      title: parsed.title ?? null,
      description: parsed.description ?? null,
      category: parsed.category ?? null,
      isMandatory: parsed.isMandatory ?? false,
      validationRules: parsed.validationRules ?? {},
      displayOrder: parsed.displayOrder ?? 0,
    };

    const [created] = await db
      .insert(lenderRequiredDocuments)
      .values(values)
      .returning();

    res.json(created);
  } catch (err) {
    next(err);
  }
});

export default router;
