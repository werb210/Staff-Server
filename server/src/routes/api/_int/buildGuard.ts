import { Router } from "express";
import { logInfo } from "../../../utils/logger.js";

const router = Router();

// Simple endpoint allowing deployment systems to verify build metadata.
router.get("/", (_req, res) => {
  logInfo("Build guard check");
  res.json({ message: "OK", build: process.env.BUILD_ID ?? "local" });
});

export default router;
