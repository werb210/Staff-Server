import { Router } from "express";

const router = Router();

/**
 * CRM ROOT
 * This exists to satisfy the server entry import and
 * prevent TypeScript / CI failure.
 */

router.get("/", (_req, res) => {
  res.json({ crm: "ok" });
});

export default router;
