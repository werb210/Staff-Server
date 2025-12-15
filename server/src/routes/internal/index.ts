import { Router } from "express";

const router = Router();

/**
 * Internal endpoints (for platform health probes / ops checks).
 * DO NOT put auth-required business logic here.
 */
router.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

router.get("/build", (_req, res) => {
  res.status(200).json({
    status: "ok",
    node: process.version,
    env: process.env.NODE_ENV ?? "unknown",
  });
});

export default router;
