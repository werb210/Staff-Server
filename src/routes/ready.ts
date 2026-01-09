import { Router } from "express";
import { assertPoolHealthy, checkDb } from "../db";
import { assertEnv } from "../config";
import { assertMigrationsTableExists } from "../migrations";
import { assertAuthSubsystem } from "../modules/auth/auth.service";
import { getStartupState } from "../startupState";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

router.get("/ready", async (_req, res) => {
  const requestId = res.locals.requestId ?? "unknown";
  const { dbConnected } = getStartupState();
  if (!dbConnected) {
    res.status(503).json({
      ok: false,
      code: "db_not_ready",
      message: "Database not ready.",
      requestId,
    });
    return;
  }

  try {
    assertEnv();
    assertAuthSubsystem();
    await checkDb();
    assertPoolHealthy();
    await assertMigrationsTableExists();
    res.json({ ok: true });
  } catch (err) {
    const reason =
      err instanceof Error && err.message
        ? ` Service not ready: ${err.message}`
        : " Service not ready.";
    res.status(503).json({
      ok: false,
      code: "service_unavailable",
      message: reason.trim(),
      requestId,
    });
  }
});

export default router;
