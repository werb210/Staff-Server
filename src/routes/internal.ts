import { Router } from "express";
import { checkDb } from "../db";
import { assertEnv, getBuildInfo } from "../config";
import { getSchemaVersion } from "../migrations";
import { listKillSwitches } from "../modules/ops/ops.service";
import { listActiveReplayJobs } from "../modules/ops/replay.service";
import { listRecentExports } from "../modules/exports/export.service";

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

router.get("/ops", async (_req, res) => {
  const switches = await listKillSwitches();
  res.json({ switches });
});

router.get("/jobs", async (_req, res) => {
  const jobs = await listActiveReplayJobs();
  res.json({ jobs });
});

router.get("/exports/recent", async (_req, res) => {
  const exports = await listRecentExports();
  res.json({ exports });
});

export default router;
