import { Router } from "express";

import { applicationService } from "../../../services/applicationService.js";

const router = Router();

router.post("/", (req, res, next) => {
  try {
    const result = applicationService.submitApplication(req.body);
    res.json({ message: "OK", submission: result });
  } catch (error) {
    next(error);
  }
});

export default router;
