"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
router.post("/api/application", async (req, res, next) => {
    const data = req.body;
    return res.json({
        success: true,
        data,
    });
});
router.post("/api/application/update", async (_req, res) => {
    return res.json({ success: true });
});
router.post("/api/application/continuation", async (_req, res) => {
    return res.json({ success: true });
});
router.post("/api/readiness/submit", async (_req, res) => {
    return res.json({
        success: true,
        status: "submitted",
    });
});
exports.default = router;
