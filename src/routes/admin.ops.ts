import { Router } from "express";
import { AppError } from "../middleware/errors";
import { requireAuth, requireCapability } from "../middleware/auth";
import { CAPABILITIES } from "../auth/capabilities";
import { recordAuditEvent } from "../modules/audit/audit.service";
import { logError } from "../observability/logger";
import {
  OPS_KILL_SWITCH_KEYS,
  type OpsKillSwitchKey,
  listKillSwitches,
  setKillSwitch,
} from "../modules/ops/ops.service";
import {
  createReplayJob,
  getReplayJobStatus,
  REPLAY_SCOPES,
  runReplayJob,
} from "../modules/ops/replay.service";

const router = Router();

router.use(requireAuth);
router.use(requireCapability([CAPABILITIES.OPS_MANAGE]));

function assertKillSwitchKey(key: string): asserts key is OpsKillSwitchKey {
  if (!OPS_KILL_SWITCH_KEYS.includes(key as OpsKillSwitchKey)) {
    throw new AppError("invalid_kill_switch", "Unsupported kill switch key.", 400);
  }
}

router.get("/kill-switches", async (req, res, next) => {
  try {
    const switches = await listKillSwitches();
    await recordAuditEvent({
      action: "ops_kill_switches_viewed",
      actorUserId: req.user?.userId ?? null,
      targetUserId: null,
      targetType: "ops",
      targetId: "kill_switches",
      ip: req.ip,
      userAgent: req.get("user-agent"),
      success: true,
    });
    res.json({ switches });
  } catch (err) {
    next(err);
  }
});

router.post("/kill-switches/:key/enable", async (req, res, next) => {
  try {
    const key = req.params.key ?? "";
    assertKillSwitchKey(key);
    await setKillSwitch(key, true);
    await recordAuditEvent({
      action: "ops_kill_switch_enabled",
      actorUserId: req.user?.userId ?? null,
      targetUserId: null,
      targetType: "ops_kill_switch",
      targetId: key,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      success: true,
    });
    res.json({ key, enabled: true });
  } catch (err) {
    next(err);
  }
});

router.post("/kill-switches/:key/disable", async (req, res, next) => {
  try {
    const key = req.params.key ?? "";
    assertKillSwitchKey(key);
    await setKillSwitch(key, false);
    await recordAuditEvent({
      action: "ops_kill_switch_disabled",
      actorUserId: req.user?.userId ?? null,
      targetUserId: null,
      targetType: "ops_kill_switch",
      targetId: key,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      success: true,
    });
    res.json({ key, enabled: false });
  } catch (err) {
    next(err);
  }
});

router.post("/replay/:scope", async (req, res, next) => {
  try {
    const scope = req.params.scope ?? "";
    if (!REPLAY_SCOPES.includes(scope as (typeof REPLAY_SCOPES)[number])) {
      throw new AppError("invalid_scope", "Unsupported replay scope.", 400);
    }
    const job = await createReplayJob(scope);
    await recordAuditEvent({
      action: "ops_replay_started",
      actorUserId: req.user?.userId ?? null,
      targetUserId: null,
      targetType: "ops_replay",
      targetId: job.scope,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      success: true,
    });
    setImmediate(() => {
      runReplayJob(job.id, job.scope).catch((error) => {
        const message = error instanceof Error ? error.message : "unknown error";
        logError("replay_failed", { code: "replay_failed", message });
      });
    });
    res.status(202).json({ job });
  } catch (err) {
    next(err);
  }
});

router.get("/replay/:id/status", async (req, res, next) => {
  try {
    const job = await getReplayJobStatus(req.params.id);
    if (!job) {
      throw new AppError("not_found", "Replay job not found.", 404);
    }
    await recordAuditEvent({
      action: "ops_replay_status_viewed",
      actorUserId: req.user?.userId ?? null,
      targetUserId: null,
      targetType: "ops_replay",
      targetId: job.id,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      success: true,
    });
    res.json({ job });
  } catch (err) {
    next(err);
  }
});

export default router;
