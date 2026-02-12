import { Router } from "express";
import type { Request, Response } from "express";
import { logAnalyticsEvent } from "../services/analyticsService";

const router = Router();

async function captureAnalyticsEvent(req: Request, res: Response) {
  const { event, eventType, metadata } = req.body as {
    event?: string;
    eventType?: string;
    metadata?: Record<string, unknown>;
  };
  const resolvedEvent = event ?? eventType;

  if (!resolvedEvent) {
    res.status(400).json({ error: "Event is required" });
    return;
  }

  await logAnalyticsEvent({
    event: resolvedEvent,
    ...(metadata ? { metadata } : {}),
    ...(req.ip ? { ip: req.ip } : {}),
    ...(req.headers["user-agent"] ? { userAgent: req.headers["user-agent"] } : {}),
  });

  res.json({ logged: true });
}

router.post("/", captureAnalyticsEvent);
router.post("/event", captureAnalyticsEvent);

export default router;
