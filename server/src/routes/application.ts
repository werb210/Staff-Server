import { Router } from "express";
import * as applicationController from "../controllers/applicationController.js";

const router = Router();

router.post("/start", applicationController.startApplication);
router.post("/:applicationId/update-step", applicationController.updateStep);
router.post("/:applicationId/submit", applicationController.submitApplication);
router.get("/:applicationId", applicationController.getApplication);

export default router;
