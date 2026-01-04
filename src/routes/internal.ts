import { Router } from "express";
import { checkDb } from "../db";
import { assertEnv, getBuildInfo } from "../config";
import { getSchemaVersion } from "../migrations";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

router.get("/ready", async (_req, res) => {
  try {
    assertEnv();
    await checkDb();
    res.json({ ok: true });
  } catch (err) {
    const requestId = res.locals.requestId ?? "unknown";
    const reason =
      err instanceof Error && err.message
        ? ` Service not ready: ${err.message}`
        : " Service not ready.";
    res.status(503).json({
      code: "service_unavailable",
      message: reason.trim(),
      requestId,
    });
  }
});

router.get("/version", async (_req, res) => {
  try {
    const { commitHash, buildTimestamp } = getBuildInfo();
    const schemaVersion = await getSchemaVersion();
    res.json({ commitHash, buildTimestamp, schemaVersion });
  } catch {
    const requestId = res.locals.requestId ?? "unknown";
    res.status(503).json({
      code: "service_unavailable",
      message: "Version information unavailable.",
      requestId,
    });
  }
});

export default router;
