import { Router } from "express";
import { logInfo } from "../../../utils/logger.js";

const router = Router();

// Internal health check used by CI pipelines.
router.get("/", (_req, res) => {
  logInfo("Internal health check");
  res.json({ message: "OK", internal: true });
});

export default router;
