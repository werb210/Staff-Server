import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { safeHandler } from "../middleware/safeHandler.js";
import { pool } from "../db.js";
import { ApplicationStage } from "../modules/applications/pipelineState.js";

const router = Router();

router.get("/", requireAuth, safeHandler(async (_req: any, res: any) => {
  res.json({ ok: true });
}));

router.get("/metrics", requireAuth, safeHandler(async (_req: any, res: any) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [active, wonMonth, leads, stageBreakdown] = await Promise.all([
    pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM applications
       WHERE pipeline_state NOT IN ($1, $2)`,
      [ApplicationStage.ACCEPTED, ApplicationStage.REJECTED]
    ),
    pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM applications
       WHERE pipeline_state = $1
         AND updated_at >= date_trunc('month', now())`,
      [ApplicationStage.ACCEPTED]
    ),
    pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM crm_leads
       WHERE created_at >= $1`,
      [today]
    ),
    pool.query<{ stage: string; count: string }>(
      `SELECT pipeline_state AS stage, COUNT(*)::text AS count
       FROM applications
       WHERE pipeline_state NOT IN ($1, $2)
       GROUP BY pipeline_state`,
      [ApplicationStage.ACCEPTED, ApplicationStage.REJECTED]
    ),
  ]);

  const pipelineByStage: Record<string, number> = {};
  (stageBreakdown.rows ?? []).forEach((r: any) => {
    pipelineByStage[r.stage] = parseInt(r.count, 10);
  });

  res.json({
    status: "ok",
    data: {
      activeApplications: parseInt(active.rows[0]?.count ?? "0", 10),
      dealsWonThisMonth: parseInt(wonMonth.rows[0]?.count ?? "0", 10),
      newLeadsToday: parseInt(leads.rows[0]?.count ?? "0", 10),
      commissionEarned: 0, // TODO: wire from referrals table
      pipelineByStage,
    },
  });
}));

router.get("/pipeline", safeHandler(async (_req: any, res: any) => {
  res.json({ stages: [] });
}));

router.get("/actions", safeHandler(async (_req: any, res: any) => {
  res.json({ count: 0 });
}));

router.get("/document-health", requireAuth, safeHandler(async (_req: any, res: any) => {
  res.json({ status: "ok", data: {} });
}));

router.get("/lender-activity", requireAuth, safeHandler(async (_req: any, res: any) => {
  res.json({ status: "ok", data: {} });
}));

router.get("/offers", requireAuth, safeHandler(async (_req: any, res: any) => {
  res.json({ status: "ok", data: [] });
}));

export default router;
