import { Router } from "express";
import { z } from "zod";
import { isPlaceholderSilo, respondWithPlaceholder } from "../../utils/placeholder.js";

const router = Router();

router.get("/", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const calls = req.silo!.services.calls.listCalls();
  res.json({ message: "OK", data: calls });
});

router.post("/log", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const payload = z
    .object({
      to: z.string().min(1),
      from: z.string().min(1),
      durationSeconds: z.number().int().nonnegative(),
      outcome: z.enum(["completed", "no-answer", "busy"]),
      notes: z.string().optional(),
    })
    .safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ message: "Invalid call payload" });
  }
  const call = req.silo!.services.calls.logCall(
    payload.data.to,
    payload.data.from,
    payload.data.durationSeconds,
    payload.data.outcome,
    payload.data.notes,
  );
  res.status(201).json({ message: "OK", data: call });
});

export default router;
