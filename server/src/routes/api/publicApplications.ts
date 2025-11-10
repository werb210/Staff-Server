import { Router } from "express";
import { applicationService } from "../../services/applicationService.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ data: applicationService.listPublicApplications() });
});

export default router;
