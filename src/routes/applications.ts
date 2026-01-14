import { Router } from "express";
import requireAuth, { requireCapability } from "../middleware/auth";
import { CAPABILITIES } from "../auth/capabilities";
import { safeHandler } from "../middleware/safeHandler";
import applicationRoutes from "../modules/applications/applications.routes";
import { respondOk } from "../utils/respondOk";

const router = Router();

router.get(
  "/",
  requireAuth,
  requireCapability([CAPABILITIES.APPLICATION_READ]),
  safeHandler((req, res) => {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 25;
    const stage =
      typeof req.query.stage === "string" && req.query.stage.trim().length > 0
        ? req.query.stage.trim()
        : "new";
    respondOk(
      res,
      {
        applications: [],
        total: 0,
        stage,
      },
      {
        page,
        pageSize,
      }
    );
  })
);

router.use("/", applicationRoutes);

export default router;
