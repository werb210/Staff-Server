import { Router } from "express";

const router = Router();

/**
 * Deterministic auth sanity endpoint.
 * If auth wiring breaks, this breaks loudly.
 */
router.get("/status", (_req, res) => {
  res.json({
    auth: "ok",
    cookies: Boolean(_req.headers.cookie),
  });
});

export default router;
