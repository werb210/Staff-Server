import { Router } from "express";
const router = Router();
/**
 * Public health endpoint (used by portals / smoke tests).
 * Keep this lightweight and always-available.
 */
router.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
});
export default router;
