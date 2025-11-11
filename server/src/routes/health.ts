import { Router } from "express";
import { logInfo } from "../utils/logger.js";

const router = Router();

router.get("/", (_req, res) => {
  logInfo("Health check GET invoked");
  res.json({ message: "OK", status: "ok" });
});

router.post("/", (_req, res) => {
  logInfo("Health check POST invoked");
  res.json({ message: "OK" });
});

router.put("/", (_req, res) => {
  logInfo("Health check PUT invoked");
  res.json({ message: "OK" });
});

router.delete("/", (_req, res) => {
  logInfo("Health check DELETE invoked");
  res.json({ message: "OK" });
});

export default router;
