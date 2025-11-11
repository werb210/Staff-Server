import { Router } from "express";
import { z } from "zod";
import { isPlaceholderSilo, respondWithPlaceholder } from "../../utils/placeholder.js";

const router = Router();

router.get("/", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const messages = req.silo!.services.sms.listMessages();
  res.json({ message: "OK", data: messages });
});

router.post("/send", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const payload = z
    .object({
      to: z.string().min(1),
      body: z.string().min(1),
      from: z.string().optional(),
    })
    .safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ message: "Invalid SMS payload" });
  }
  const message = req.silo!.services.sms.sendSms(
    payload.data.to,
    payload.data.body,
    payload.data.from,
  );
  res.status(201).json({ message: "OK", data: message });
});

router.post("/receive", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const payload = z
    .object({
      from: z.string().min(1),
      body: z.string().min(1),
      to: z.string().optional(),
    })
    .safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ message: "Invalid inbound payload" });
  }
  const message = req.silo!.services.sms.receiveSms(
    payload.data.from,
    payload.data.body,
    payload.data.to,
  );
  res.json({ message: "OK", data: message });
});

export default router;
