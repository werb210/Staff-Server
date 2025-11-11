import { Router } from "express";
import { applicationService } from "../../../services/applicationService.js";
import { ApplicationSubmitSchema } from "../../../schemas/application.schema.js";
import { logError, logInfo } from "../../../utils/logger.js";

const router = Router();

// Marks an application as submitted by a staff member.
router.post("/", (req, res) => {
  try {
    const payload = ApplicationSubmitSchema.parse(req.body);
    logInfo("Submitting application", payload);
    const application = applicationService.submitApplication(
      payload.id,
      payload.submittedBy,
    );
    res.json({ message: "OK", data: application });
  } catch (error) {
    logError("Failed to submit application", error);
    res.status(400).json({ message: "Unable to submit application" });
  }
});

export default router;
