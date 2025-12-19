import { Router } from "express";
import { db } from "../db";
import { applicationStatusEnum, applications } from "../db/schema";
import { eq } from "drizzle-orm";

const router = Router();

/**
 * GET /api/applications
 * Supports filtering by stage via query param
 * Example: /api/applications?stage=new
 */
router.get("/api/applications", async (req, res) => {
  try {
    const stage = req.query.stage as string | undefined;

    let results;

    const isValidStage =
      typeof stage === "string" &&
      applicationStatusEnum.enumValues.includes(
        stage as (typeof applicationStatusEnum.enumValues)[number],
      );

    if (isValidStage) {
      const typedStage = stage as (typeof applicationStatusEnum.enumValues)[number];

      results = await db
        .select()
        .from(applications)
        .where(eq(applications.status, typedStage));
    } else {
      results = await db.select().from(applications);
    }

    res.json(results);
  } catch (err) {
    console.error("Failed to fetch applications", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
