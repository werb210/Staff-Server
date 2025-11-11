import { Router } from "express";
import { CreateAdSchema, UpdateAutomationSchema } from "../schemas/marketingSchemas.js";
import { marketingService } from "../services/marketingService.js";
import { logInfo } from "../utils/logger.js";
import { parseWithSchema } from "../utils/validation.js";

const router = Router();

router.get("/ads", (_req, res, next) => {
  try {
    logInfo("GET /api/marketing/ads");
    const ads = marketingService.listAds();
    res.json({ message: "OK", data: ads });
  } catch (error) {
    next(error);
  }
});

router.post("/ads", (req, res, next) => {
  try {
    logInfo("POST /api/marketing/ads", req.body);
    const payload = parseWithSchema(CreateAdSchema, req.body);
    const ad = marketingService.createAd(payload);
    res.status(201).json({ message: "OK", data: ad });
  } catch (error) {
    next(error);
  }
});

router.delete("/ads/:id", (req, res, next) => {
  try {
    logInfo("DELETE /api/marketing/ads/:id", { id: req.params.id });
    const removed = marketingService.deleteAd(req.params.id);
    res.json({ message: "OK", removed });
  } catch (error) {
    next(error);
  }
});

router.get("/automation", (_req, res, next) => {
  try {
    logInfo("GET /api/marketing/automation");
    const automations = marketingService.listAutomations();
    res.json({ message: "OK", data: automations });
  } catch (error) {
    next(error);
  }
});

router.put("/automation/:id", (req, res, next) => {
  try {
    logInfo("PUT /api/marketing/automation/:id", { id: req.params.id, body: req.body });
    const payload = parseWithSchema(UpdateAutomationSchema, req.body);
    const automation = marketingService.updateAutomation(req.params.id, payload);
    res.json({ message: "OK", data: automation });
  } catch (error) {
    next(error);
  }
});

router.post("/automation", (_req, res) => {
  logInfo("POST /api/marketing/automation stub");
  res.json({ message: "OK", notice: "Automation creation stub" });
});

export default router;
