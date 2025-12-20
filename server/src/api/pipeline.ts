import { Router } from "express";
import { db } from "../db";
import { deals } from "../db/schema";
import { requireAuth } from "../middleware/requireAuth";
import { eq } from "drizzle-orm";

const router = Router();
router.use(requireAuth);

const stageOrder = ["prospect", "qualified", "proposal", "closed_won", "closed_lost"] as const;

router.get("/", async (_req, res, next) => {
  try {
    const rows = await db.select().from(deals);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/advance", async (req, res, next) => {
  try {
    const [deal] = await db.select().from(deals).where(eq(deals.id, req.params.id)).limit(1);
    if (!deal) return res.status(404).json({ error: "Deal not found" });
    const currentIndex = stageOrder.indexOf(deal.stage as (typeof stageOrder)[number]);
    const nextIndex = Math.min(currentIndex + 1, stageOrder.length - 1);
    const [updated] = await db
      .update(deals)
      .set({ stage: stageOrder[nextIndex], updatedAt: new Date() })
      .where(eq(deals.id, deal.id))
      .returning();
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
