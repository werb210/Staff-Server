"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const runtime_1 = require("../../config/runtime");
const router = (0, express_1.Router)();
router.get("/api/_int/env", (_req, res) => {
    res.json({
        apiBaseUrl: runtime_1.API_BASE,
        allowedOrigins: runtime_1.ALLOWED_ORIGINS,
    });
});
exports.default = router;
