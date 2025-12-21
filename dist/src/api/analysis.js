import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { requireAuth } from "../middleware/requireAuth";
const router = Router();
router.use(requireAuth);
router.get("/applications", async (_req, res, next) => {
    try {
        const result = await db.execute(sql `
      select status, count(*)::text as count
      from applications
      group by status
    `);
        const counts = {};
        for (const row of result.rows) {
            counts[row.status] = Number(row.count);
        }
        res.json(counts);
    }
    catch (err) {
        next(err);
    }
});
export default router;
