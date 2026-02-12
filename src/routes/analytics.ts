import { Router } from "express";
import { logAnalyticsEvent } from "../services/analyticsService";

const router = Router();

router.post("/event", async (req, res) => {
  const { event, metadata } = req.body as {
    event?: string;
    metadata?: Record<string, unknown>;
  };

  if (!event) {
    res.status(400).json({ error: "Event is required" });
    return;
  }

  await logAnalyticsEvent({
    event,
    ...(metadata ? { metadata } : {}),
    ...(req.ip ? { ip: req.ip } : {}),
    ...(req.headers["user-agent"] ? { userAgent: req.headers["user-agent"] } : {}),
  });

  res.json({ logged: true });
});

export default router;
