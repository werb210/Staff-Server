import { Router } from "express";
import { db } from "../db";
import { lenderRequiredDocuments } from "../db/schema";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();
router.use(requireAuth);

router.post("/required-documents", async (req, res, next) => {
  try {
    const parsed = req.body ?? {};

    if (!parsed.lenderProductId || !parsed.docCategory) {
      throw new Error("lenderProductId and docCategory are required");
    }

    const [created] = await db
      .insert(lenderRequiredDocuments)
      .values({
        lenderProductId: parsed.lenderProductId!,
        docCategory: parsed.docCategory!,
        title: parsed.title ?? "",
        description: parsed.description ?? "",
        category: parsed.category ?? "general",
        isMandatory: parsed.isMandatory ?? false,
        validationRules: parsed.validationRules ?? {},
        displayOrder: parsed.displayOrder ?? 0,
      })
      .returning();

    res.json(created);
  } catch (err) {
    next(err);
  }
});

export default router;
