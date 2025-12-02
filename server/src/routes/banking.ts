// server/src/routes/banking.ts
import { Router } from "express";
import bankingController from "../controllers/bankingController.js";

const router = Router();

// Only these two exist in controller
router.post("/:applicationId/run", bankingController.runAnalysis);
router.get("/:applicationId", bankingController.getAnalysis);

export default router;
