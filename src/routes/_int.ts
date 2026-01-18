import { Router } from "express";
import { isTwilioEnabled } from "../services/twilio";
import { healthHandler, readyHandler } from "./ready";
import { getBuildInfo } from "../config";
import { listRoutes } from "../debug/printRoutes";
import requireAuth from "../middleware/auth";
import internalRoutes from "./internal";

const router = Router();

const publicPaths = new Set(["/health", "/ready", "/build", "/routes", "/env"]);

router.use((req, res, next) => {
  if (publicPaths.has(req.path)) {
    next();
    return;
  }
  requireAuth(req, res, next);
});

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

router.use(internalRoutes);

export default router;
