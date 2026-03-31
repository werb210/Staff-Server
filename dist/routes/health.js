"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dbHealth_1 = require("../health/dbHealth");
const startupState_1 = require("../startupState");
const router = (0, express_1.Router)();
router.get("/healthz", async (_req, res) => {
    if (!process.env.TWILIO_VERIFY_SERVICE_SID) {
        return res.status(500).json({ success: false, message: "verify_missing" });
    }
    const health = await (0, dbHealth_1.dbHealth)();
    const ok = health.db === "ok";
    res.status(ok ? 200 : 503).json({ success: ok, ...health });
});
router.get("/readyz", (_req, res) => {
    const status = (0, startupState_1.fetchStatus)();
    const ready = status.ready && !status.reason;
    res.status(ready ? 200 : 503).json({ ready, status });
});
exports.default = router;
