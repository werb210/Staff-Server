import { Router } from "express";
import { db } from "../db";
import { applications } from "../db/schema";
import { authenticate } from "../middleware/authMiddleware";

const router = Router();
router.use(authenticate);

router.get("/applications", async (_req, res, next) => {
  try {
    const counts: Record<string, number> = {};
    const rows = await db.execute<{ status: string; count: string }>(
      `select status, count(*)::text as count from applications group by status`,
    );
    for (const row of rows.rows) {
      counts[row.status] = Number(row.count);
    }
    res.json({ counts });
  } catch (err) {
    next(err);
  }
});

export default router;
