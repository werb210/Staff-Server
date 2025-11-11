import { Router } from "express";
import { z } from "zod";
import { isPlaceholderSilo, respondWithPlaceholder } from "../../utils/placeholder.js";

const router = Router();

router.get("/", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const ads = req.silo!.services.marketing.listAds();
  res.json({ message: "OK", data: ads });
});

router.post("/toggle", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const payload = z
    .object({
      id: z.string().uuid(),
      active: z.boolean(),
    })
    .safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ message: "Invalid toggle payload" });
  }
  const ad = req.silo!.services.marketing.toggleAd(payload.data.id, payload.data.active);
  res.json({ message: "OK", data: ad });
});

router.post("/create", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const payload = z
    .object({
      name: z.string().min(1),
      description: z.string().min(1),
      channel: z.string().min(1),
      spend: z.number().nonnegative(),
      active: z.boolean(),
    })
    .safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ message: "Invalid ad payload" });
  }
  const ad = req.silo!.services.marketing.createAd(payload.data);
  res.status(201).json({ message: "OK", data: ad });
});

export default router;
