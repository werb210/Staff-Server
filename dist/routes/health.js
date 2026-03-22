"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const startupState_1 = require("../startupState");
const router = (0, express_1.Router)();
router.get('/health/db', (req, res) => {
    if (process.env.TEST_MODE === 'true') {
        return res.status(200).json({
            status: 'ok',
            db: 'skipped',
        });
    }
    const ready = (0, startupState_1.isReady)();
    if (!ready) {
        return res.status(503).json({
            status: 'db-failed',
            db: 'disconnected',
        });
    }
    return res.status(200).json({
        status: 'ok',
        db: 'connected',
    });
});
exports.default = router;
