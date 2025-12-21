import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
const router = Router();
router.use(requireAuth);
/**
 * GET /api/applications
 * Supports pipeline queries:
 *  - stage
 *  - sort
 */
router.get("/", async (req, res) => {
    const { stage, sort } = req.query;
    // TEMP: deterministic stub so portal unblocks immediately
    // Replace with DB query once pipeline mutations are wired
    res.json({
        stage: stage ?? "new",
        sort: sort ?? "newest",
        items: [],
    });
});
export default router;
