import { Router } from "express";
import { z } from "zod";
import { marketingService } from "../../../services/marketingService.js";
import { logError, logInfo } from "../../../utils/logger.js";

const router = Router();

const AutomationSchema = z.object({
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
 * GET /api/marketing/automation
 * Example: curl http://localhost:5000/api/marketing/automation
 */
router.get("/", (_req, res) => {
  logInfo("Listing automations");
  res.json({ message: "OK", data: marketingService.listAutomations() });
});

/**
 * POST /api/marketing/automation
 * Example: curl -X POST http://localhost:5000/api/marketing/automation \
 *   -H 'Content-Type: application/json' -d '{"name":"Welcome","description":"New lead series","channel":"Email","spend":0}'
 */
router.post("/", (req, res) => {
  try {
    const payload = AutomationSchema.parse(req.body);
    logInfo("Creating automation", payload);
    const automation = marketingService.createAutomation({
      ...payload,
      active: payload.active ?? true,
    });
    res.status(201).json({ message: "OK", data: automation });
  } catch (error) {
    logError("Failed to create automation", error);
    res.status(400).json({ message: "Invalid automation payload" });
  }
});

/**
 * POST /api/marketing/automation/:id/toggle
 * Example: curl -X POST http://localhost:5000/api/marketing/automation/<id>/toggle \
 *   -H 'Content-Type: application/json' -d '{"active":false}'
 */
router.post("/:id/toggle", (req, res) => {
  try {
    const payload = ToggleSchema.parse(req.body);
    logInfo("Toggling automation", { id: req.params.id, ...payload });
    const automation = marketingService.toggleAutomation(req.params.id, payload.active);
    res.json({ message: "OK", data: automation });
  } catch (error) {
    logError("Failed to toggle automation", error);
    res.status(400).json({ message: (error as Error).message });
  }
});

export default router;
