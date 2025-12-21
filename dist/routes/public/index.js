"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
/**
 * Public health endpoint (used by portals / smoke tests).
 * Keep this lightweight and always-available.
 */
router.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
});
exports.default = router;
