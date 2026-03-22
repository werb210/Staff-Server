"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateVoiceToken = generateVoiceToken;
const uuid_1 = require("uuid");
const twilioModule = require("twilio");
const AccessToken = twilioModule.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;
function generateVoiceToken(identity) {
    const resolvedIdentity = identity?.trim().length ? identity : (0, uuid_1.v4)();
    const token = new AccessToken(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_API_KEY, process.env.TWILIO_API_SECRET, {
        identity: resolvedIdentity,
        ttl: 3600,
    });
    const voiceGrant = new VoiceGrant({
        outgoingApplicationSid: process.env.TWILIO_VOICE_APP_SID,
        incomingAllow: true,
    });
    token.addGrant(voiceGrant);
    return token.toJwt();
}
