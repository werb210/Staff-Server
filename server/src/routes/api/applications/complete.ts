import { Router } from "express";
import { applicationService } from "../../../services/applicationService.js";
import { ApplicationCompleteSchema } from "../../../schemas/application.schema.js";
import { logError, logInfo } from "../../../utils/logger.js";

const router = Router();

// Marks an application as fully completed.
router.post("/", (req, res) => {
  try {
    const payload = ApplicationCompleteSchema.parse(req.body);
    logInfo("Completing application", payload);
    const application = applicationService.completeApplication(
      payload.id,
      payload.completedBy,
    );
    res.json({ message: "OK", data: application });
  } catch (error) {
    logError("Failed to complete application", error);
    res.status(400).json({ message: "Unable to complete application" });
  }
});

export default router;
