"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const safeHandler_1 = require("../../middleware/safeHandler");
const ai_service_1 = require("./ai.service");
const router = (0, express_1.Router)();
router.post("/session/start", (0, safeHandler_1.safeHandler)(async (req, res, next) => {
    const context = req.body?.context;
    if (!["website", "client", "portal"].includes(context)) {
        res.status(400).json({ error: "Invalid context" });
        return;
    }
    const session = (0, ai_service_1.startSession)(context);
    res.json({ sessionId: session.id });
}));
router.post("/message", (0, safeHandler_1.safeHandler)(async (req, res, next) => {
    const { sessionId, message } = req.body;
    if (typeof sessionId !== "string" || typeof message !== "string" || !message.trim()) {
        res.status(400).json({ error: "sessionId and message are required" });
        return;
    }
    const reply = await (0, ai_service_1.handleMessage)(sessionId, message);
    res.json(reply);
}));
router.post("/escalate", (0, safeHandler_1.safeHandler)(async (req, res, next) => {
    const { sessionId } = req.body;
    if (typeof sessionId !== "string" || !sessionId.trim()) {
        res.status(400).json({ error: "sessionId is required" });
        return;
    }
    res.json((0, ai_service_1.escalate)(sessionId));
}));
router.post("/report", (0, safeHandler_1.safeHandler)(async (req, res, next) => {
    const { sessionId, message, screenshot } = req.body;
    if (typeof sessionId !== "string" || typeof message !== "string" || !message.trim()) {
        res.status(400).json({ error: "sessionId and message are required" });
        return;
    }
    res.json((0, ai_service_1.reportIssue)(sessionId, message, screenshot));
}));
exports.default = router;
