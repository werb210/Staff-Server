import { Router } from "express";
import { z } from "zod";

import { lenderService } from "../../../services/lenderService.js";

const router = Router();

const sendToLenderSchema = z.object({
  applicationId: z.string().min(1),
  lenderId: z.string().min(1),
  sentBy: z.string().min(1)
});

router.post("/", (req, res, next) => {
  try {
    const payload = sendToLenderSchema.parse(req.body);
    const response = lenderService.sendToLender(payload);
    res.json({ message: "OK", result: response });
  } catch (error) {
    next(error);
  }
});

export default router;
