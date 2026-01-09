import { Router } from "express";
import { assertPoolHealthy, checkDb, pool } from "../db";
import { assertEnv, getBuildInfo } from "../config";
import { assertMigrationsTableExists } from "../migrations";
import { listKillSwitches } from "../modules/ops/ops.service";
import { listActiveReplayJobs } from "../modules/ops/replay.service";
import { listRecentExports } from "../modules/exports/export.service";
import { assertAuthSubsystem } from "../modules/auth/auth.service";
import { createUserAccount } from "../modules/auth/auth.service";
import { ROLES } from "../auth/roles";
import { AppError } from "../middleware/errors";
import { logInfo, logWarn } from "../observability/logger";

const router = Router();
let bootstrapAdminDisabled = false;

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

router.get("/ready", async (_req, res) => {
  try {
    assertEnv();
    assertAuthSubsystem();
    await checkDb();
    assertPoolHealthy();
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
  const { commitHash, buildTimestamp } = getBuildInfo();
  res.json({ commitHash, buildTimestamp });
});

router.post("/bootstrap-admin", async (req, res, next) => {
  try {
    logInfo("bootstrap_admin_attempt", {
      disabled: bootstrapAdminDisabled,
    });

    if (bootstrapAdminDisabled) {
      throw new AppError(
        "bootstrap_disabled",
        "Bootstrap has already been used.",
        410
      );
    }

    const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
    if (!password) {
      throw new AppError(
        "bootstrap_missing_password",
        "BOOTSTRAP_ADMIN_PASSWORD is required.",
        500
      );
    }

    const countRes = await pool.query<{ count: number }>(
      "select count(*)::int as count from users where role = $1",
      [ROLES.ADMIN]
    );
    const adminCount = countRes.rows[0]?.count ?? 0;
    logInfo("bootstrap_admin_count", { adminCount });

    if (adminCount > 0) {
      logWarn("bootstrap_admin_blocked", { reason: "admin_exists" });
      throw new AppError(
        "bootstrap_disabled",
        "Admin user already exists.",
        409
      );
    }

    const user = await createUserAccount({
      email: "todd.w@boreal.financial",
      password,
      role: ROLES.ADMIN,
      actorUserId: null,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });

    bootstrapAdminDisabled = true;
    logInfo("bootstrap_admin_success", {
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(201).json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
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
