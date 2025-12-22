import { Router } from "express";
const router = Router();
/**
 * GET /api/public/health
 */
router.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
export default router;
