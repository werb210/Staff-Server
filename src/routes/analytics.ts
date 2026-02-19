import { Router } from "express";
import { dbQuery } from "../db";
import { requireAuth } from "../middleware/auth";
import { listPriorityLeads } from "../modules/applications/applications.repo";

const router = Router();

router.post("/", async (req, res) => {
  const { eventName, data } = req.body as {
    eventName?: string;
    data?: Record<string, unknown>;
  };

  if (!eventName) {
    res.status(400).json({ error: "eventName is required" });
    return;
  }

  await dbQuery(
    `insert into analytics_events (event_name, payload)
     values ($1, $2::jsonb)`,
    [eventName, JSON.stringify(data ?? {})]
  );

  res.json({ success: true });
});

router.get("/priority-leads", requireAuth, async (_req, res) => {
  const leads = await listPriorityLeads();
  res.json(leads);
});

export default router;
