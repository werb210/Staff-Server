import { Router } from "express";
import { lenderService } from "../../../services/lenderService.js";
import { logError, logInfo } from "../../../utils/logger.js";

const router = Router();

// Returns aggregated lender analytics from the stub service.
router.get("/", (_req, res) => {
  try {
    logInfo("Generating lender reports");
    const report = lenderService.generateReports();
    res.json({ message: "OK", data: report });
  } catch (error) {
    logError("Failed to generate lender report", error);
    res.status(400).json({ message: "Unable to generate lender report" });
  }
});

export default router;
