import { Router } from "express";
import { z } from "zod";

import { aiService } from "../../services/aiService.js";
import { applicationService } from "../../services/applicationService.js";

const router = Router();

const summaryRequestSchema = z.object({
  applicationId: z.string().min(1),
  context: z.string().default("Summary requested via API")
});

router.get("/", async (_req, res, next) => {
  try {
    const [application] = applicationService.listApplications();
    if (!application) {
      res.json({ message: "OK", summary: null });
      return;
    }
    const summary = await aiService.generateApplicationSummary(application, "Automated insight");
    res.json({ message: "OK", summary, applicationId: application.id });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const payload = summaryRequestSchema.parse(req.body);
    const application = applicationService.listApplications().find((app) => app.id === payload.applicationId);
    if (!application) {
      throw new Error(`Application ${payload.applicationId} not found`);
    }
    const summary = await aiService.generateApplicationSummary(application, payload.context);
    res.status(201).json({ message: "OK", summary, applicationId: application.id });
  } catch (error) {
    next(error);
  }
});

export default router;
