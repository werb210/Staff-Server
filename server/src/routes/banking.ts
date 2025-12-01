import { Router } from "express";
import bankingController from "../controllers/bankingController.js";

const router = Router();

// Only runAnalysis + getAnalysis exist
router.post("/:applicationId/run", bankingController.runAnalysis);
router.get("/:applicationId", bankingController.getAnalysis);

export default router;
