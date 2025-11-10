import { Router } from "express";

const router = Router();

/**
 * GET /api/marketing/ads
 * Provides stubbed marketing ad metrics.
 */
router.get("/", (_req, res) => {
  res.json({
    message: "Marketing ads retrieved",
    ads: [
      {
        id: "ad-1",
        channel: "facebook",
        budget: 5000
      }
    ]
  });
});

export default router;
