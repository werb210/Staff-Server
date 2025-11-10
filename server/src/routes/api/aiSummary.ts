import { Router } from "express";
import { applicationService } from "../../services/applicationService.js";
import { aiService } from "../../services/aiService.js";

const router = Router();

router.post("/", async (req, res, next) => {
  try {
    const applications = applicationService.listApplications();
    const application = applications[0];
    if (!application) {
      res.status(404).json({ message: "No applications available" });
      return;
    }
    const context = typeof req.body?.context === "string" ? req.body.context : "Loan application summary";
    const summary = await aiService.generateApplicationSummary(application, context);
    res.json({ data: summary });
  } catch (error) {
    next(error);
  }
});

export default router;
