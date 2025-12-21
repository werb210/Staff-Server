"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sms_routes_1 = __importDefault(require("./sms.routes"));
const chat_routes_1 = __importDefault(require("./chat.routes"));
const voice_service_1 = require("./voice.service");
const communications_validators_1 = require("./communications.validators");
const requireAuth_1 = require("../middleware/requireAuth");
const errors_1 = require("../errors");
const router = (0, express_1.Router)();
const voiceService = new voice_service_1.VoiceService();
router.use("/sms", sms_routes_1.default);
router.use("/chat", chat_routes_1.default);
router.post("/voice/log", requireAuth_1.requireAuth, async (req, res, next) => {
    try {
        const payload = communications_validators_1.voiceLogSchema.parse(req.body);
        if (!payload.applicationId || !payload.phoneNumber || !payload.eventType) {
            throw new errors_1.BadRequest("invalid voice payload");
        }
        const record = await voiceService.logEvent({
            applicationId: payload.applicationId,
            phoneNumber: payload.phoneNumber,
            eventType: payload.eventType,
            durationSeconds: payload.durationSeconds,
        });
        res.json({ ok: true, record });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
