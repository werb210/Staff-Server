import { Router } from "express";
import { lenderService } from "../../../services/lenderService.js";

const router = Router();

/**
 * GET /api/lenders/reports
 * Responds with a minimal report payload.
 */
router.get("/", (_req, res) => {
  const report = lenderService.generateReport();
  res.json({ message: "Lender report generated", report });
});

export default router;
