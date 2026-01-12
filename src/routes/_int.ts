import { Router } from "express";
import { getTwilioClient } from "../config/twilio";
import { healthHandler, readyHandler } from "./ready";

const router = Router();

router.get("/health", healthHandler);
router.get("/ready", readyHandler);

router.get("/env", (_req, res) =>
  res.json({
    twilioAvailable: getTwilioClient().available,
  })
);

router.post("/twilio-test", async (_req, res) => {
  const { available, client } = getTwilioClient();
  if (!available || !client) {
    return res.status(503).json({ ok: false });
  }
  return res.json({ ok: true });
});

export default router;
