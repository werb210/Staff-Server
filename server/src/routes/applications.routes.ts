// server/src/routes/applications.routes.ts
import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { applicationService } from "../services/applicationService.js";

const router = Router();

// GET /api/applications
router.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json({ ok: true, data: await applicationService.all() });
  })
);

// GET /api/applications/:id
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const row = await applicationService.get(req.params.id);
    res.json({ ok: true, data: row });
  })
);

// POST /api/applications
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const created = await applicationService.create(req.body);
    res.json({ ok: true, data: created });
  })
);

export default router;
