import { Router } from "express";
import { twilioAvailable, twilioClient } from "../config/twilio";
import { healthHandler, readyHandler } from "./ready";

const router = Router();

router.get("/health", healthHandler);
router.get("/ready", readyHandler);

router.get("/env", (_req, res) =>
  res.json({
    twilioAvailable,
  })
);

router.post("/twilio-test", async (_req, res) => {
  if (!twilioClient) {
    return res.status(503).json({ ok: false });
  }
  return res.json({ ok: true });
});

export default router;
