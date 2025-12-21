"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const requireAuth_1 = require("../middleware/requireAuth");
const router = (0, express_1.Router)();
router.use(requireAuth_1.requireAuth);
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
exports.default = router;
