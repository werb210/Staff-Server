import { Router } from "express";
import { z } from "zod";

import { marketingService } from "../../../services/marketingService.js";

const router = Router();

const adSchema = z.object({
  platform: z.enum(["google", "facebook", "linkedin", "microsoft"]),
  name: z.string().min(1),
  budget: z.number().positive(),
  status: z.enum(["draft", "active", "paused"]).optional()
});

router.get("/", (_req, res) => {
  const ads = marketingService.listAds();
  res.json({ message: "OK", ads });
});

router.post("/", (req, res, next) => {
  try {
    const payload = adSchema.parse(req.body);
    const ad = marketingService.createAd(payload);
    res.status(201).json({ message: "OK", ad });
  } catch (error) {
    next(error);
  }
});

export default router;
