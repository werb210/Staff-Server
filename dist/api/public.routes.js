"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
/**
 * GET /api/public/health
 */
router.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
exports.default = router;
