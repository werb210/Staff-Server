import { Router, Request, Response } from "express";
import { db } from "../db";
import { applications } from "../db/schema";
import { desc } from "drizzle-orm";

const router = Router();

/**
 * Health check
 */
router.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

/**
 * Applications (no stage filtering yet — schema does not support it)
 */
router.get("/applications", async (_req: Request, res: Response) => {
  try {
    const results = await db
      .select()
      .from(applications)
      .orderBy(desc(applications.createdAt))
      .limit(50);

    res.json(results);
  } catch (error) {
    console.error("Failed to fetch applications", error);
    res.status(500).json({ error: "Failed to fetch applications" });
  }
});

export default router;
