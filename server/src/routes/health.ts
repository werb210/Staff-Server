import type { Request, Response } from "express";
import { Router } from "express";
import { pool } from "../db";

const router = Router();

async function healthHandler(_req: Request, res: Response) {
  try {
    await pool.query("select 1 as ok");
    res.status(200).json({ status: "ok", db: "connected" });
  } catch (e: any) {
    res.status(500).json({ status: "error", db: "disconnected", error: String(e?.message ?? e) });
  }
}

// Support BOTH paths
router.get("/health", healthHandler);
router.get("/api/health", healthHandler);

export default router;
