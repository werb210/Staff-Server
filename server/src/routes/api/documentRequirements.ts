import { Router } from "express";
import { documentRequirementService } from "../../services/documentRequirementService.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ data: documentRequirementService.listRequirements() });
});

export default router;
