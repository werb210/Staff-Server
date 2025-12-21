import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
const router = Router();
router.use(requireAuth);
router.get("/", (_req, res) => {
    const events = [];
    res.json({ items: Array.isArray(events) ? events : [] });
});
router.get("/view-week", (_req, res) => {
    const events = [];
    res.json({ items: Array.isArray(events) ? events : [] });
});
export default router;
