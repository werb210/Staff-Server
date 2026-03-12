import { Router } from "express";

const router = Router();

router.get("/call-status", async (_req, res) => {
  try {
    res.status(200).json({
      status: "idle",
      activeCall: false,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Telephony call-status error:", error);

    res.status(200).json({
      status: "unknown",
      activeCall: false,
    });
  }
});

router.get("/health", (_req, res) => {
  res.status(200).json({
    telephony: "ok",
    timestamp: new Date().toISOString(),
  });
});

export default router;
