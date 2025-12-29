"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
router.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
router.get("/build", (_req, res) => {
    res.json({
        name: "staff-server",
        env: process.env.NODE_ENV || "unknown",
    });
});
exports.default = router;
