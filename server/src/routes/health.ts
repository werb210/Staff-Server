import { Router } from "express";
import { logInfo } from "../utils/logger.js";

const router = Router();

// Basic service health endpoint used by load balancers and uptime monitors.
router.get("/", (_req, res) => {
  logInfo("Public health check");
  res.json({ message: "OK", service: "health" });
});

export default router;
