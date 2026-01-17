import { Router } from "express";
import { isTwilioEnabled } from "../services/twilio";
import { healthHandler, readyHandler } from "./ready";
import { getBuildInfo } from "../config";
import { listRoutes } from "../debug/printRoutes";

const router = Router();

router.get("/health", healthHandler);
router.get("/ready", readyHandler);
router.get("/build", (_req, res) => {
  const { commitHash, buildTimestamp } = getBuildInfo();
  res.status(200).json({ commitHash, buildTimestamp });
});

router.get("/routes", (req, res) => {
  const routes = listRoutes(req.app).map((route) => ({
    method: route.method,
    path: route.path,
  }));
  res.status(200).json({ routes });
});

router.get("/env", (_req, res) =>
  res.json({
    twilioAvailable: isTwilioEnabled(),
  })
);

router.post("/twilio-test", async (_req, res) => {
  return res.json({ ok: true });
});

export default router;
