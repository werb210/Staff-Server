import { Router } from "express";
import { logInfo } from "../utils/logger.js";

const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  logInfo("GET /api/health invoked");
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default healthRouter;
