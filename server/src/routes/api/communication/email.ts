import { Router } from "express";
import { z } from "zod";

import { emailService } from "../../../services/emailService.js";

const router = Router();

const emailSchema = z.object({
  to: z.string().email(),
  from: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1)
});

router.get("/", (_req, res) => {
  const emails = emailService.listEmails();
  res.json({ message: "OK", emails });
});

router.post("/", (req, res, next) => {
  try {
    const payload = emailSchema.parse(req.body);
    const email = emailService.sendEmail(payload);
    res.status(201).json({ message: "OK", email });
  } catch (error) {
    next(error);
  }
});

export default router;
