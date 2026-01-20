import { Router } from "express";
import { isTwilioEnabled } from "../services/twilio";
import { getBuildInfo } from "../config";
import { listRouteInventory } from "../debug/printRoutes";
import { readyHandler } from "./ready";
import requireAuth from "../middleware/requireAuth";
import internalRoutes from "./internal";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});
router.get("/ready", readyHandler);
router.get("/build", (_req, res) => {
  const { commitHash, buildTimestamp } = getBuildInfo();
  res.status(200).json({ commitHash, buildTimestamp });
});

router.get("/routes", (req, res) => {
  const inventory = listRouteInventory(req.app);
  res.status(200).json({ routes: inventory });
});

router.get("/env", (_req, res) =>
  res.json({
    twilioAvailable: isTwilioEnabled(),
  })
);

router.post("/twilio-test", requireAuth, async (_req, res) => {
  return res.json({ ok: true });
});

router.use(internalRoutes);

export default router;
