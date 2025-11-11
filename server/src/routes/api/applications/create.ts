import { Router } from "express";
import { applicationService } from "../../../services/applicationService.js";
import { ApplicationCreateSchema } from "../../../schemas/application.schema.js";
import { logError, logInfo } from "../../../utils/logger.js";

const router = Router();

// Endpoint used by onboarding flows to create an application draft.
router.post("/", (req, res) => {
  try {
    const payload = ApplicationCreateSchema.parse(req.body);
    logInfo("API create application", { applicant: payload.applicantName });
    const application = applicationService.createApplication(payload);
    res.status(201).json({ message: "OK", data: application });
  } catch (error) {
    logError("Failed to create application via API", error);
    res.status(400).json({ message: "Invalid application payload" });
  }
});

export default router;
