import { Router } from "express";

import { applicationService } from "../../services/applicationService.js";

const router = Router();

router.get("/", (_req, res) => {
  const applications = applicationService.listPublicApplications();
  res.json({ message: "OK", applications });
});

export default router;
