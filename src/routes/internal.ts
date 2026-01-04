import { Router } from "express";
import { assertSchema, checkDb } from "../db";
import { assertEnv, getBuildInfo } from "../config";
import { assertNoPendingMigrations, getSchemaVersion } from "../migrations";
import { assertAuthSubsystem } from "../modules/auth/auth.service";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

router.get("/ready", async (_req, res) => {
  try {
    assertEnv();
    await checkDb();
    await assertNoPendingMigrations();
    await assertSchema();
    assertAuthSubsystem();
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
