import { Router } from "express";
import { z } from "zod";
import { isPlaceholderSilo, respondWithPlaceholder } from "../../utils/placeholder.js";

const router = Router();

router.get("/", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const emails = req.silo!.services.emails.listEmails();
  res.json({ message: "OK", data: emails });
});

router.post("/send", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const payload = z
    .object({
      to: z.string().email(),
      subject: z.string().min(1),
      body: z.string().min(1),
      from: z.string().email().optional(),
    })
    .safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ message: "Invalid email payload" });
  }
  const email = req.silo!.services.emails.sendEmail(payload.data);
  res.status(201).json({ message: "OK", data: email });
});

router.post("/receive", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const payload = z
    .object({
      from: z.string().email(),
      to: z.string().email(),
      subject: z.string().min(1),
      body: z.string().min(1),
    })
    .safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ message: "Invalid inbound payload" });
  }
  const email = req.silo!.services.emails.receiveEmail(payload.data);
  res.json({ message: "OK", data: email });
});

export default router;
