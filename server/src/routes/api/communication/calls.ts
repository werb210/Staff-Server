import { Router } from "express";
import { z } from "zod";

import { twilioService } from "../../../services/twilioService.js";

const router = Router();

const callSchema = z.object({
  to: z.string().min(1),
  from: z.string().min(1),
  subject: z.string().min(1)
});

router.get("/", (_req, res) => {
  res.json({ message: "OK", status: "Voice call stub active" });
});

router.post("/", (req, res, next) => {
  try {
    const payload = callSchema.parse(req.body);
    const result = twilioService.initiateCall(payload);
    res.status(201).json({ message: "OK", result });
  } catch (error) {
    next(error);
  }
});

export default router;
