import { Router } from "express";

import { documentRequirementService } from "../../services/documentRequirementService.js";

const router = Router();

router.get("/", (_req, res) => {
  const requirements = documentRequirementService.listRequirements();
  res.json({ message: "OK", requirements });
});

export default router;
