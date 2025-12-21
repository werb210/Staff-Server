"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const health_service_1 = require("../services/health.service");
const router = (0, express_1.Router)();
router.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
router.get("/health/db", async (_req, res) => {
    try {
        await (0, db_1.assertDatabaseConnection)();
        const ok = await (0, db_1.verifyDatabaseConnection)();
        return res.json({ status: ok ? "ok" : "fail" });
    }
    catch (error) {
        return res.status(503).json({ status: "fail", error: error.message });
    }
});
router.get("/health/auth", (_req, res) => {
    const result = (0, health_service_1.authHealthCheck)();
    const statusCode = result.status === "ok" ? 200 : 503;
    return res.status(statusCode).json(result);
});
exports.default = router;
