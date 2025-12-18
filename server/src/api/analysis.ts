import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { authenticate } from "../middleware/authMiddleware";

const router = Router();

router.use(authenticate);

router.get("/applications", async (_req, res, next) => {
  try {
    const counts: Record<string, number> = {};

    const result = await db.execute<{
      status: string;
      count: string;
    }>(
      sql`select status, count(*)::text as count from applications group by status`
    );

    for (const row of result.rows) {
      counts[row.status] = Number(row.count);
    }

    res.json(counts);
  } catch (err) {
    next(err);
  }
});

export default router;
