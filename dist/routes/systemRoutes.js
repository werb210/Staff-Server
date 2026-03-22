"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
/*
Continuation route used by Portal and Client
*/
router.get("/continuation/:token", async (req, res, next) => {
    const { token } = req.params;
    if (!token) {
        return res.status(400).json({ error: "Missing continuation token" });
    }
    return res.json({
        success: true,
        token,
    });
});
router.post("/continuation", async (_req, res) => {
    return res.json({
        success: true,
    });
});
/*
Call system status endpoint
Used by portal dialer + client call system
*/
router.get("/call/status", async (_req, res) => {
    return res.json({
        service: "voice",
        status: "online",
        timestamp: Date.now(),
    });
});
/*
Support escalations endpoint
*/
router.get("/support/escalations", async (_req, res) => {
    return res.json({
        escalations: [],
    });
});
exports.default = router;
