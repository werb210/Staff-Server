"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const uuid_1 = require("uuid");
const auth_1 = require("../../middleware/auth");
const tokenService_1 = require("../services/tokenService");
const router = express_1.default.Router();
function isTwilioEnabled() {
    return Boolean(process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_VOICE_APP_SID &&
        process.env.TWILIO_API_KEY &&
        process.env.TWILIO_API_SECRET);
}
// Voice token — used by portal dialer to initialise Twilio.Device
router.get("/token", auth_1.auth, async (req, res) => {
    if (!isTwilioEnabled()) {
        return res.status(503).json({ success: false, error: "Telephony not configured" });
    }
    const identity = req.user?.userId ||
        req.user?.id ||
        req.user?.sub ||
        (0, uuid_1.v4)();
    try {
        const token = (0, tokenService_1.generateVoiceToken)(identity);
        return res.status(200).json({ success: true, data: { token } });
    }
    catch (err) {
        console.error("Voice token generation failed:", err?.message);
        return res.status(500).json({ success: false, error: "token_generation_failed" });
    }
});
router.get("/presence", (_req, res) => {
    res.json({ status: "available" });
});
router.get("/call-status", (_req, res) => {
    res.json({ calls: [] });
});
router.post("/outbound-call", (_req, res) => {
    res.json({ success: true });
});
router.post("/call-status", (_req, res) => {
    res.json({ updated: true });
});
exports.default = router;
