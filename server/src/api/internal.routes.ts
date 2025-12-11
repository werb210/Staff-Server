import { Router } from "express";
import { db } from "../db";                       // adjust if your db export path differs
import { blobClient } from "../services/azureBlob"; // adjust if needed

const router = Router();

// Lightweight DB check — does NOT leak data
async function checkDb(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`;   // works in Prisma & pg driver compatible systems
    return true;
  } catch {
    return false;
  }
}

// Lightweight Blob Storage check
async function checkBlob(): Promise<boolean> {
  try {
    // Attempt to list the root container segment to confirm connectivity
    await blobClient.getProperties();
    return true;
  } catch {
    return false;
  }
}

router.get("/health", async (_req, res) => {
  const dbOk = await checkDb();
  const blobOk = await checkBlob();

  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || "unknown",
    db: dbOk,
    blob: blobOk
  });
});

export default router;
