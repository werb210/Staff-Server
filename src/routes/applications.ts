import { Router } from "express";
import requireAuth, { requireCapability } from "../middleware/auth";
import { CAPABILITIES } from "../auth/capabilities";
import { safeHandler } from "../middleware/safeHandler";
import applicationRoutes from "../modules/applications/applications.routes";

const router = Router();

router.get(
  "/",
  requireAuth,
  requireCapability([CAPABILITIES.APPLICATION_READ]),
  safeHandler((_req, res) => {
    res.json({ applications: [] });
  })
);

router.use("/", applicationRoutes);

export default router;
