import { Router } from "express";
import { isTwilioEnabled } from "../services/twilio";
import { healthHandler, readyHandler } from "./ready";

const router = Router();

router.get("/health", healthHandler);
router.get("/ready", readyHandler);

router.get("/env", (_req, res) =>
  res.json({
    twilioAvailable: isTwilioEnabled(),
  })
);

router.post("/twilio-test", async (_req, res) => {
  return res.json({ ok: true });
});

export default router;
