import { Router } from "express";
import { dbHealth } from "../health/dbHealth";
import { fetchStatus } from "../startupState";

const router = Router();

router.get("/healthz", async (_req, res) => {
  if (!process.env.TWILIO_VERIFY_SERVICE_SID) {
    return res.status(500).json({ success: false, message: "verify_missing" });
  }
  const health = await dbHealth();
  const ok = health.db === "ok";
  res.status(ok ? 200 : 503).json({ success: ok, ...health });
});

router.get("/readyz", (_req, res) => {
  const status = fetchStatus();
  const ready = status.ready && !status.reason;
  res.status(ready ? 200 : 503).json({ ready, status });
});

export default router;
