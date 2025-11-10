import { Router } from "express";

const router = Router();

/**
 * GET /api/marketing/automation
 * Returns stubbed marketing automation workflows.
 */
router.get("/", (_req, res) => {
  res.json({
    message: "Marketing automations retrieved",
    workflows: [
      {
        id: "workflow-1",
        name: "Welcome Series",
        status: "active"
      }
    ]
  });
});

export default router;
