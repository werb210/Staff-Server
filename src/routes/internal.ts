import { Router, Request, Response, NextFunction } from "express";
import { checkDb } from "../db";
import { assertEnv, getBuildInfo } from "../config";
import { assertMigrationsTableExists } from "../migrations";
import { listKillSwitches } from "../modules/ops/ops.service";
import { listActiveReplayJobs } from "../modules/ops/replay.service";
import { listRecentExports } from "../modules/exports/export.service";
import { assertAuthSubsystem } from "../modules/auth/auth.service";

const router = Router();

router.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

router.get("/ready", async (_req: Request, res: Response) => {
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

router.get("/version", (_req: Request, res: Response) => {
  const { commitHash, buildTimestamp } = getBuildInfo();
  res.json({ commitHash, buildTimestamp });
});

router.get("/ops", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const switches = await listKillSwitches();
    res.json({ switches });
  } catch (err) {
    next(err);
  }
});

router.get("/jobs", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const jobs = await listActiveReplayJobs();
    res.json({ jobs });
  } catch (err) {
    next(err);
  }
});

router.get("/exports/recent", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const exports = await listRecentExports();
    res.json({ exports });
  } catch (err) {
    next(err);
  }
});

export default router;
