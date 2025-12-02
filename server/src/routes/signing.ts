import { Router } from "express";
import signingController from "../controllers/signingController.js";

const router = Router();

// Correct surface for new controller
router.post("/:applicationId/request", signingController.requestSignature);
router.get("/:applicationId/signatures", signingController.listForApplication);
router.get("/:applicationId/signed-documents", signingController.getSignedDocuments);

export default router;
