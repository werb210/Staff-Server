import { Router } from "express";

import { applicationService } from "../../../services/applicationService.js";

const router = Router();

router.post("/", (req, res, next) => {
  try {
    const result = applicationService.completeApplication(req.body);
    res.json({ message: "OK", completion: result });
  } catch (error) {
    next(error);
  }
});

export default router;
