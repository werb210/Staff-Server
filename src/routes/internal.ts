import { Router } from "express";
import { checkDb } from "../db";
import { assertEnv, COMMIT_SHA } from "../config";
import { assertMigrationsTableExists } from "../migrations";
import { listKillSwitches } from "../modules/ops/ops.service";
import { listActiveReplayJobs } from "../modules/ops/replay.service";
import { listRecentExports } from "../modules/exports/export.service";
import { assertAuthSubsystem } from "../modules/auth/auth.service";
import packageJson from "../../package.json";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

router.get("/ready", async (_req, res) => {
  try {
    assertEnv();
    assertAuthSubsystem();
    await checkDb();
    await assertMigrationsTableExists();
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

router.get("/version", (_req, res) => {
  const version = COMMIT_SHA !== "unknown" ? COMMIT_SHA : packageJson.version;
  const env = process.env.NODE_ENV ?? "production";
  res.json({ version, env });
});

router.get("/ops", async (_req, res, next) => {
  try {
    const switches = await listKillSwitches();
    res.json({ switches });
  } catch (err) {
    next(err);
  }
});

router.get("/jobs", async (_req, res, next) => {
  try {
    const jobs = await listActiveReplayJobs();
    res.json({ jobs });
  } catch (err) {
    next(err);
  }
});

router.get("/exports/recent", async (_req, res, next) => {
  try {
    const exports = await listRecentExports();
    res.json({ exports });
  } catch (err) {
    next(err);
  }
});

export default router;
