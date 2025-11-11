import { Router } from "express";

import { lenderService } from "../../../services/lenderService.js";

const router = Router();

router.get("/", (_req, res) => {
  const reports = lenderService.listReports();
  res.json({ message: "OK", reports });
});

export default router;
