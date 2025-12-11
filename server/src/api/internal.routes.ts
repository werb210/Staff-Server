import { Router } from "express";

const router = Router();

/**
 * Internal health endpoints
 * No authentication.
 * Always return 200.
 */

// Basic health check — used by curl
router.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Azure liveness probe
router.get("/liveness", (req, res) => {
  res.status(200).send("alive");
});

// Azure readiness probe
router.get("/readiness", (req, res) => {
  res.status(200).send("ready");
});

// Internal ping
router.get("/ping", (req, res) => {
  res.status(200).json({ message: "pong" });
});

export default router;
