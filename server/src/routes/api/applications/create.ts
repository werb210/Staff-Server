import { Router } from "express";

import { applicationService } from "../../../services/applicationService.js";

const router = Router();

router.post("/", (req, res, next) => {
  try {
    const application = applicationService.createApplication(req.body);
    res.status(201).json({ message: "OK", application });
  } catch (error) {
    next(error);
  }
});

export default router;
