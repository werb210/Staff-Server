import { Router } from "express";
import { assertSchema, checkDb } from "../db";
import { assertEnv } from "../config";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

router.get("/ready", async (_req, res) => {
  try {
    assertEnv();
    await checkDb();
    await assertSchema();
    res.json({ ok: true });
  } catch {
    const requestId = res.locals.requestId ?? "unknown";
    res.status(503).json({
      code: "service_unavailable",
      message: "Service not ready.",
      requestId,
    });
  }
});

export default router;
