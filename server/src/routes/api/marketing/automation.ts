import { Router } from "express";
import { z } from "zod";

import { marketingService } from "../../../services/marketingService.js";

const router = Router();

const activateSchema = z.object({
  journeyId: z.string().min(1)
});

router.get("/", (_req, res) => {
  const journeys = marketingService.listJourneys();
  res.json({ message: "OK", journeys });
});

router.post("/activate", (req, res, next) => {
  try {
    const payload = activateSchema.parse(req.body);
    const journey = marketingService.activateJourney(payload.journeyId);
    if (!journey) {
      throw new Error(`Journey ${payload.journeyId} not found`);
    }
    res.json({ message: "OK", journey });
  } catch (error) {
    next(error);
  }
});

export default router;
