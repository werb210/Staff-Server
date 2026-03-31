"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const VoiceResponse_1 = __importDefault(require("twilio/lib/twiml/VoiceResponse"));
const router = express_1.default.Router();
// inbound call webhook
router.post("/incoming", (_req, res) => {
    const voiceResponse = new VoiceResponse_1.default();
    voiceResponse.say("Connecting you to Maya.");
    voiceResponse.dial().client("maya-agent");
    res.type("text/xml");
    res.send(voiceResponse.toString());
});
exports.default = router;
