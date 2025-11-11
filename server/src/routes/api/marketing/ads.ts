import { Router } from "express";
import { z } from "zod";
import { marketingService } from "../../../services/marketingService.js";
import { logError, logInfo } from "../../../utils/logger.js";

const router = Router();

const AdSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  active: z.boolean().optional(),
  channel: z.string().min(1),
  spend: z.number().min(0),
});

const ToggleSchema = z.object({
  active: z.boolean(),
});

/**
 * GET /api/marketing/ads
 * Example: curl http://localhost:5000/api/marketing/ads
 */
router.get("/", (_req, res) => {
  logInfo("Listing marketing ads");
  res.json({ message: "OK", data: marketingService.listAds() });
});

/**
 * POST /api/marketing/ads
 * Example: curl -X POST http://localhost:5000/api/marketing/ads \
 *   -H 'Content-Type: application/json' -d '{"name":"LinkedIn","description":"Sponsored posts","channel":"Social","spend":600}'
 */
router.post("/", (req, res) => {
  try {
    const payload = AdSchema.parse(req.body);
    logInfo("Creating marketing ad", payload);
    const ad = marketingService.createAd({
      ...payload,
      active: payload.active ?? true,
    });
    res.status(201).json({ message: "OK", data: ad });
  } catch (error) {
    logError("Failed to validate ad", error);
    res.status(400).json({ message: "Invalid ad payload" });
  }
});

/**
 * POST /api/marketing/ads/:id/toggle
 * Example: curl -X POST http://localhost:5000/api/marketing/ads/<id>/toggle \
 *   -H 'Content-Type: application/json' -d '{"active":false}'
 */
router.post("/:id/toggle", (req, res) => {
  try {
    const payload = ToggleSchema.parse(req.body);
    logInfo("Toggling marketing ad", { id: req.params.id, ...payload });
    const ad = marketingService.toggleAd(req.params.id, payload.active);
    res.json({ message: "OK", data: ad });
  } catch (error) {
    logError("Failed to toggle ad", error);
    res.status(400).json({ message: (error as Error).message });
  }
});

export default router;
