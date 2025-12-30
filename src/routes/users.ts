import { Router } from "express";

const router = Router();

/**
 * GET /api/users
 */
router.get("/", (_req, res) => {
  res.status(501).json({ error: "not implemented" });
});

/**
 * GET /api/users/:id
 */
router.get("/:id", (req, res) => {
  res.status(501).json({
    error: "not implemented",
    userId: req.params.id,
  });
});

export default router;
