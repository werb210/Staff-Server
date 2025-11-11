import { Router } from "express";
import { z } from "zod";
import { logError, logInfo } from "../../../utils/logger.js";

const router = Router();

const AdSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  budget: z.number().min(0),
});

// Lists synthetic ad campaigns for dashboards.
router.get("/", (_req, res) => {
  logInfo("Listing marketing ads");
  res.json({
    message: "OK",
    data: [
      { id: "3d8a4b39-4f29-4ddd-8627-0d8b284dd2a9", name: "Search", budget: 1200 },
      { id: "6879be9f-7b3d-4be3-a3cf-43b7d623c2d6", name: "Display", budget: 800 },
    ],
  });
});

// Validates ad payloads and echoes them back to the client.
router.post("/", (req, res) => {
  try {
    const ad = AdSchema.parse(req.body);
    logInfo("Received marketing ad", ad);
    res.status(201).json({ message: "OK", data: ad });
  } catch (error) {
    logError("Failed to validate ad", error);
    res.status(400).json({ message: "Invalid ad payload" });
  }
});

export default router;
